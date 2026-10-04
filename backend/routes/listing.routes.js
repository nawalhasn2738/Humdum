const express = require('express');
const {
  createListing,
  deactivateListing,
  getLandlordListings,
  getListingById,
  getManagedListing,
  getListings,
  getOwnedListing,
  updateListing,
} = require('../controllers/listing.controller');
const { getSafetyScore } = require('../controllers/safety-index.controller');
const { getCommuteEstimate } = require('../controllers/commute.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { cacheResponse } = require('../middleware/cache');

const router = express.Router();

router.get('/', cacheResponse({ namespace: 'listings', ttlSeconds: 60 }), getListings);
router.get(
  '/mine',
  authenticate,
  authorizeRoles(['landlord']),
  getLandlordListings
);
router.get(
  '/manage/:id',
  authenticate,
  authorizeRoles(['landlord', 'admin', 'safety_inspector']),
  getManagedListing
);
router.get(
  '/mine/:id',
  authenticate,
  authorizeRoles(['landlord']),
  getOwnedListing
);
router.put(
  '/:id',
  authenticate,
  authorizeRoles(['landlord']),
  updateListing
);
router.post(
  '/:id/deactivate',
  authenticate,
  authorizeRoles(['landlord']),
  deactivateListing
);
router.get(
  '/:id/safety-score',
  cacheResponse({ namespace: 'safety-score', ttlSeconds: 120 }),
  getSafetyScore
);
router.post(
  '/:id/commute',
  authenticate,
  authorizeRoles(['tenant']),
  getCommuteEstimate
);
router.get('/:id', getListingById);
router.post(
  '/',
  authenticate,
  authorizeRoles(['landlord']),
  createListing
);

module.exports = router;
