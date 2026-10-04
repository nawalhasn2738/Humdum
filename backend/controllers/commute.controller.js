const { getListingCommute } = require('../services/commute.service');
const { validateCommuteRequest } = require('../services/routing-policy.service');
function isPositiveId(value) { return /^[1-9]\d*$/.test(String(value)); }
async function getCommuteEstimate(req, res) {
  if (!isPositiveId(req.params.id)) return res.status(400).json({ error: 'A valid listing ID is required.', code: 'VALIDATION_ERROR' });
  const validation = validateCommuteRequest(req.body);
  if (validation.errors) return res.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', fields: validation.errors });
  try { return res.json(await getListingCommute({ listingId: req.params.id, ...validation.value })); }
  catch (error) {
    if (error.code === 'LISTING_NOT_FOUND') return res.status(404).json({ error: 'Listing not found.', code: error.code });
    if (error.code === 'LISTING_LOCATION_UNAVAILABLE') return res.status(422).json({ error: error.message, code: error.code });
    if (error.code === 'ROUTING_NOT_CONFIGURED') return res.status(503).json({ error: error.message, code: error.code });
    if (error.code === 'ROUTING_PROVIDER_FAILURE') return res.status(502).json({ error: error.message, code: error.code });
    console.error('Commute estimate failed:', error);
    return res.status(500).json({ error: 'Unable to calculate commute estimates.' });
  }
}
module.exports = { getCommuteEstimate };
