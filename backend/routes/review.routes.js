const express = require('express');
const { create, eligibility, listingReviews } = require('../controllers/review.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const router = express.Router();
router.get('/listing/:listingId', listingReviews);
router.get('/eligibility/:listingId', authenticate, authorizeRoles(['tenant']), eligibility);
router.post('/', authenticate, authorizeRoles(['tenant']), create);
module.exports = router;
