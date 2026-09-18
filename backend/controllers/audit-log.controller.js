const { getListingAuditTrail } = require('../services/audit-trail.service');

function isPositiveId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

async function getAuditLogs(req, res) {
  if (!isPositiveId(req.params.listingId)) {
    return res.status(400).json({ error: 'A valid listing ID is required.' });
  }

  try {
    const auditTrail = await getListingAuditTrail(req.params.listingId);

    if (!auditTrail) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    return res.json(auditTrail);
  } catch (error) {
    console.error('Audit trail fetch failed:', error.message);
    return res.status(500).json({ error: 'Unable to fetch audit trail.' });
  }
}

module.exports = { getAuditLogs };
