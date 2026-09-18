const { calculateSafetyIndex } = require('../services/safety-index.service');

function isPositiveId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

async function getSafetyScore(req, res) {
  if (!isPositiveId(req.params.id)) {
    return res.status(400).json({ error: 'A valid listing ID is required.' });
  }

  try {
    const safetyScore = await calculateSafetyIndex(req.params.id);

    if (!safetyScore) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    return res.json(safetyScore);
  } catch (error) {
    console.error('Safety index calculation failed:', error.message);
    return res.status(500).json({ error: 'Unable to calculate safety score.' });
  }
}

module.exports = { getSafetyScore };
