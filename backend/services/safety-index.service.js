const pool = require('../db');

const WEIGHTS = Object.freeze({
  compliance: 0.5,
  tenantReviews: 0.3,
  securityInfrastructure: 0.2,
});

function roundScore(value) {
  return Math.round(value * 100) / 100;
}

function toDateString(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}

function getRating(score, completeness) {
  if (completeness === 0) {
    return 'unrated';
  }

  if (score >= 80) {
    return 'high';
  }

  if (score >= 60) {
    return 'moderate';
  }

  return 'low';
}

async function calculateSafetyIndex(listingId) {
  const result = await pool.query(
    `SELECT
       l.id AS listing_id,
       l.title,
       ST_Y(l.geo_point) AS latitude,
       ST_X(l.geo_point) AS longitude,
       a.id AS audit_id,
       a.fire_safety_score,
       a.cctv_verified,
       a.warden_verified,
       a.audit_score,
       a.expiry_date,
       a.created_at AS audit_created_at,
       r.average_rating,
       r.review_count
     FROM listings l
     LEFT JOIN LATERAL (
       SELECT *
       FROM compliance_audits
       WHERE listing_id = l.id
       ORDER BY created_at DESC, id DESC
       LIMIT 1
     ) a ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         AVG(reviews.rating)::numeric(5, 2) AS average_rating,
         COUNT(*)::integer AS review_count
       FROM reviews
       INNER JOIN tenancies ON tenancies.id = reviews.tenancy_id
       WHERE tenancies.listing_id = l.id
         AND LOWER(tenancies.status) IN ('completed', 'ended')
     ) r ON TRUE
     WHERE l.id = $1`,
    [listingId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  const expiryDate = toDateString(row.expiry_date);
  const today = new Date().toISOString().slice(0, 10);
  const hasCurrentAudit = Boolean(row.audit_id && expiryDate && expiryDate >= today);
  const reviewCount = Number(row.review_count || 0);
  const hasVerifiedReviews = reviewCount > 0;

  const complianceScore = hasCurrentAudit
    ? Number(row.fire_safety_score || 0)
    : 0;
  const tenantReviewScore = hasVerifiedReviews
    ? roundScore(Number(row.average_rating) * 20)
    : 0;
  const securityInfrastructureScore = hasCurrentAudit
    ? ((row.cctv_verified ? 100 : 0) + (row.warden_verified ? 100 : 0)) / 2
    : 0;

  const safetyIndex = roundScore(
    complianceScore * WEIGHTS.compliance +
      tenantReviewScore * WEIGHTS.tenantReviews +
      securityInfrastructureScore * WEIGHTS.securityInfrastructure
  );
  const dataCompleteness = Math.round(
    (hasCurrentAudit
      ? WEIGHTS.compliance + WEIGHTS.securityInfrastructure
      : 0) *
      100 +
      (hasVerifiedReviews ? WEIGHTS.tenantReviews * 100 : 0)
  );

  return {
    listing: {
      id: String(row.listing_id),
      title: row.title,
      location:
        row.latitude === null || row.longitude === null
          ? null
          : {
              latitude: Number(row.latitude),
              longitude: Number(row.longitude),
            },
    },
    safetyIndex,
    rating: getRating(safetyIndex, dataCompleteness),
    dataCompleteness,
    components: {
      compliance: {
        score: complianceScore,
        weight: WEIGHTS.compliance,
        weightedScore: roundScore(complianceScore * WEIGHTS.compliance),
        currentAudit: hasCurrentAudit,
        latestAuditScore: row.audit_score === null ? null : Number(row.audit_score),
        expiryDate,
      },
      tenantReviews: {
        score: tenantReviewScore,
        weight: WEIGHTS.tenantReviews,
        weightedScore: roundScore(
          tenantReviewScore * WEIGHTS.tenantReviews
        ),
        averageRating:
          row.average_rating === null ? null : Number(row.average_rating),
        verifiedReviewCount: reviewCount,
        verificationRule: 'completed_or_ended_tenancy',
      },
      securityInfrastructure: {
        score: securityInfrastructureScore,
        weight: WEIGHTS.securityInfrastructure,
        weightedScore: roundScore(
          securityInfrastructureScore * WEIGHTS.securityInfrastructure
        ),
        cctvVerified: hasCurrentAudit ? row.cctv_verified : false,
        wardenVerified: hasCurrentAudit ? row.warden_verified : false,
      },
    },
    proximityRisk: {
      score: null,
      available: false,
      reason: 'No verified proximity-risk data source is configured.',
    },
    calculatedAt: new Date().toISOString(),
  };
}

module.exports = { calculateSafetyIndex, WEIGHTS };

