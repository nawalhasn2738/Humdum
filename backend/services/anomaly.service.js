const pool = require('../db');

const THRESHOLDS = Object.freeze({
  marketRadiusKm: 5,
  minimumComparables: 3,
  lowRentMedianRatio: 0.6,
  rapidMessageWindowMinutes: 5,
  rapidMessageCount: 20,
  rapidDistinctRecipients: 5,
});

async function flagListing(client, listingId, anomalyType, severityScore, evidence) {
  await client.query(
    `INSERT INTO anomaly_reports (
       entity_type, listing_id, anomaly_type, severity_score, evidence
     )
     VALUES ('listing', $1, $2, $3, $4::jsonb)
     ON CONFLICT (listing_id, anomaly_type)
       WHERE entity_type = 'listing' AND status = 'open'
     DO UPDATE SET
       severity_score = EXCLUDED.severity_score,
       evidence = EXCLUDED.evidence,
       detected_at = NOW()`,
    [listingId, anomalyType, severityScore, JSON.stringify(evidence)]
  );

  await client.query(
    `UPDATE listings
     SET moderation_status = 'under_review',
         anomaly_score = GREATEST(anomaly_score, $2)
     WHERE id = $1`,
    [listingId, severityScore]
  );
}

async function flagUser(client, userId, anomalyType, severityScore, evidence) {
  await client.query(
    `INSERT INTO anomaly_reports (
       entity_type, user_id, anomaly_type, severity_score, evidence
     )
     VALUES ('user', $1, $2, $3, $4::jsonb)
     ON CONFLICT (user_id, anomaly_type)
       WHERE entity_type = 'user' AND status = 'open'
     DO UPDATE SET
       severity_score = EXCLUDED.severity_score,
       evidence = EXCLUDED.evidence,
       detected_at = NOW()`,
    [userId, anomalyType, severityScore, JSON.stringify(evidence)]
  );

  await client.query(
    `UPDATE users
     SET moderation_status = 'under_review',
         risk_score = GREATEST(risk_score, $2)
     WHERE id = $1`,
    [userId, severityScore]
  );
}

async function detectListingAnomalies(listingId) {
  let client;
  const flags = [];

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const listingResult = await client.query(
      `SELECT
         listings.id,
         listings.landlord_id,
         listings.rent,
         listings.description,
         listings.geo_point,
         users.is_verified AS landlord_verified
       FROM listings
       INNER JOIN users ON users.id = listings.landlord_id
       WHERE listings.id = $1
       FOR UPDATE`,
      [listingId]
    );

    if (listingResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return [];
    }

    const listing = listingResult.rows[0];

    if (listing.geo_point) {
      const marketResult = await client.query(
        `SELECT
           COUNT(*)::integer AS comparable_count,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY rent) AS median_rent
         FROM listings
         WHERE id <> $1
           AND geo_point IS NOT NULL
           AND moderation_status <> 'suspended'
           AND ST_DWithin(
             geo_point::geography,
             (SELECT geo_point::geography FROM listings WHERE id = $1),
             $2::double precision * 1000.0
           )`,
        [listingId, THRESHOLDS.marketRadiusKm]
      );
      const comparableCount = Number(marketResult.rows[0].comparable_count);
      const medianRent = Number(marketResult.rows[0].median_rent);
      const rent = Number(listing.rent);

      if (
        comparableCount >= THRESHOLDS.minimumComparables &&
        Number.isFinite(medianRent) &&
        rent < medianRent * THRESHOLDS.lowRentMedianRatio
      ) {
        const evidence = {
          rent,
          medianRent,
          comparableCount,
          radiusKm: THRESHOLDS.marketRadiusKm,
          medianRatio: Math.round((rent / medianRent) * 1000) / 1000,
        };
        await flagListing(client, listingId, 'rent_below_local_median', 70, evidence);
        flags.push({ type: 'rent_below_local_median', severityScore: 70, evidence });
      }
    }

    if (!listing.landlord_verified && listing.description?.trim()) {
      const duplicateResult = await client.query(
        `SELECT
           COUNT(DISTINCT other.landlord_id)::integer AS duplicate_landlords,
           ARRAY_AGG(DISTINCT other.id) AS duplicate_listing_ids
         FROM listings other
         INNER JOIN users landlord ON landlord.id = other.landlord_id
         WHERE other.id <> $1
           AND other.landlord_id <> $2
           AND landlord.is_verified = FALSE
           AND LOWER(REGEXP_REPLACE(TRIM(other.description), '\\s+', ' ', 'g')) =
               LOWER(REGEXP_REPLACE(TRIM($3), '\\s+', ' ', 'g'))`,
        [listingId, listing.landlord_id, listing.description]
      );
      const duplicateLandlords = Number(
        duplicateResult.rows[0].duplicate_landlords || 0
      );

      if (duplicateLandlords > 0) {
        const evidence = {
          duplicateLandlords,
          duplicateListingIds: duplicateResult.rows[0].duplicate_listing_ids || [],
        };
        await flagListing(client, listingId, 'duplicate_unverified_description', 80, evidence);
        flags.push({
          type: 'duplicate_unverified_description',
          severityScore: 80,
          evidence,
        });
      }
    }

    await client.query('COMMIT');
    return flags;
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client?.release();
  }
}

async function detectMessagingAnomalies(userId) {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT
         COUNT(*)::integer AS message_count,
         COUNT(DISTINCT receiver_id)::integer AS distinct_recipients
       FROM messages
       WHERE sender_id = $1
         AND created_at >= NOW() - ($2::double precision * INTERVAL '1 minute')`,
      [userId, THRESHOLDS.rapidMessageWindowMinutes]
    );
    const messageCount = Number(result.rows[0].message_count);
    const distinctRecipients = Number(result.rows[0].distinct_recipients);

    if (
      messageCount < THRESHOLDS.rapidMessageCount &&
      distinctRecipients < THRESHOLDS.rapidDistinctRecipients
    ) {
      await client.query('COMMIT');
      return [];
    }

    const severityScore = Math.min(
      100,
      60 +
        Math.max(0, messageCount - THRESHOLDS.rapidMessageCount) * 2 +
        Math.max(0, distinctRecipients - THRESHOLDS.rapidDistinctRecipients) * 5
    );
    const evidence = {
      messageCount,
      distinctRecipients,
      windowMinutes: THRESHOLDS.rapidMessageWindowMinutes,
    };

    await flagUser(
      client,
      userId,
      'rapid_messaging_burst',
      severityScore,
      evidence
    );
    await client.query('COMMIT');

    return [{ type: 'rapid_messaging_burst', severityScore, evidence }];
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client?.release();
  }
}

async function getOpenAnomalyReports() {
  const result = await pool.query(
    `SELECT
       reports.*,
       listings.title AS listing_title,
       listing_owner.name AS listing_owner_name,
       users.name AS user_name,
       users.email AS user_email,
       users.risk_score AS user_risk_score
     FROM anomaly_reports reports
     LEFT JOIN listings ON listings.id = reports.listing_id
     LEFT JOIN users listing_owner ON listing_owner.id = listings.landlord_id
     LEFT JOIN users ON users.id = reports.user_id
     WHERE reports.status = 'open'
     ORDER BY reports.severity_score DESC, reports.detected_at DESC`
  );

  return result.rows;
}

module.exports = {
  THRESHOLDS,
  detectListingAnomalies,
  detectMessagingAnomalies,
  getOpenAnomalyReports,
};



