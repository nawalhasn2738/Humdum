const {
  upsertLatestAudit,
  findLatestAudit,
} = require('../services/compliance.service');
const { invalidateCachePattern } = require('../services/cache.service');
const { enqueueComplianceNotification } = require('../queues/compliance.queue');

function isPositiveId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function computeAuditScore(fireSafetyScore, cctvVerified, wardenVerified) {
  const cctvScore = cctvVerified ? 100 : 0;
  const wardenScore = wardenVerified ? 100 : 0;
  return Math.round(((fireSafetyScore + cctvScore + wardenScore) / 3) * 100) / 100;
}

function serializeAudit(row) {
  const expiryDate =
    row.expiry_date instanceof Date
      ? row.expiry_date.toISOString().slice(0, 10)
      : row.expiry_date;

  return {
    id: String(row.id),
    listingId: String(row.listing_id),
    fireSafetyScore: Number(row.fire_safety_score),
    cctvVerified: row.cctv_verified,
    wardenVerified: row.warden_verified,
    auditScore: Number(row.audit_score),
    expiryDate,
    createdAt: row.created_at,
  };
}

function getSafetyStatus(audit) {
  const today = new Date().toISOString().slice(0, 10);

  if (audit.expiryDate < today) {
    return 'expired';
  }

  if (audit.auditScore >= 80) {
    return 'verified';
  }

  if (audit.auditScore >= 60) {
    return 'conditional';
  }

  return 'needs_attention';
}

async function saveAudit(req, res) {
  if (!isPositiveId(req.params.id)) {
    return res.status(400).json({ error: 'A valid listing ID is required.' });
  }

  if (!req.user.profileId) {
    return res.status(403).json({
      error: 'A registered administrator or inspector profile is required.',
    });
  }

  const {
    fire_safety_score: fireSafetyValue,
    cctv_verified: cctvVerified,
    warden_verified: wardenVerified,
    expiry_date: expiryDate,
  } = req.body;
  const fireSafetyScore = Number(fireSafetyValue);

  if (
    fireSafetyValue === null ||
    fireSafetyValue === undefined ||
    String(fireSafetyValue).trim() === '' ||
    !Number.isFinite(fireSafetyScore) ||
    fireSafetyScore < 0 ||
    fireSafetyScore > 100 ||
    typeof cctvVerified !== 'boolean' ||
    typeof wardenVerified !== 'boolean' ||
    !isValidDate(expiryDate)
  ) {
    return res.status(400).json({
      error:
        'fire_safety_score must be between 0 and 100, verification values must be booleans, and expiry_date must use YYYY-MM-DD.',
    });
  }

  const auditScore = computeAuditScore(
    fireSafetyScore,
    cctvVerified,
    wardenVerified
  );

  try {
    const result = await upsertLatestAudit(req.params.id, {
      fireSafetyScore,
      cctvVerified,
      wardenVerified,
      auditScore,
      expiryDate,
    }, req.user.profileId);
    const audit = serializeAudit(result.audit);

    await invalidateCachePattern(
      `cache:safety-score:/api/listings/${req.params.id}/safety-score*`
    );

    try {
      await enqueueComplianceNotification({
        listingId: req.params.id,
        auditId: audit.id,
        action: result.created ? 'created' : 'updated',
        actorId: req.user.profileId,
        queuedAt: new Date().toISOString(),
      });
    } catch (queueError) {
      console.error('Compliance notification enqueue failed:', queueError.message);
    }

    return res.status(result.created ? 201 : 200).json({
      message: result.created
        ? 'Compliance audit created successfully.'
        : 'Compliance audit updated successfully.',
      audit,
      safetyStatus: getSafetyStatus(audit),
    });
  } catch (error) {
    if (error.code === 'LISTING_NOT_FOUND') {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    console.error('Compliance audit save failed:', error.message);
    return res.status(500).json({ error: 'Unable to save compliance audit.' });
  }
}

async function getAudit(req, res) {
  if (!isPositiveId(req.params.id)) {
    return res.status(400).json({ error: 'A valid listing ID is required.' });
  }

  try {
    const result = await findLatestAudit(req.params.id);

    if (!result.listingFound) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    if (!result.audit) {
      return res.json({
        listing: result.listing,
        audit: null,
        safetyStatus: 'not_audited',
      });
    }

    const audit = serializeAudit(result.audit);


    return res.json({
      listing: result.listing,
      audit,
      safetyStatus: getSafetyStatus(audit),
    });
  } catch (error) {
    console.error('Compliance audit fetch failed:', error.message);
    return res.status(500).json({ error: 'Unable to fetch compliance audit.' });
  }
}

module.exports = { saveAudit, getAudit };




