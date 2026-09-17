const express = require('express');
const { createListing, getListings } = require('../controllers/listing.controller');
const { getSafetyScore } = require('../controllers/safety-index.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { cacheResponse } = require('../middleware/cache');

const router = express.Router();

router.get('/', cacheResponse({ namespace: 'listings', ttlSeconds: 60 }), getListings);
router.get(
  '/:id/safety-score',
  cacheResponse({ namespace: 'safety-score', ttlSeconds: 120 }),
  getSafetyScore
);
router.post(
  '/',
  authenticate,
  authorizeRoles(['landlord', 'admin']),
  createListing
);

module.exports = router;


