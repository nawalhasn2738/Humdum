const express = require('express');
const { getAnomalies } = require('../controllers/anomaly.controller');
const { listVerificationQueue, decideVerification } = require('../controllers/admin-verification.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/anomalies', authenticate, authorizeRoles(['admin']), getAnomalies);
router.get('/verifications', authenticate, authorizeRoles(['admin', 'safety_inspector']), listVerificationQueue);
router.post('/verifications/:listingId/decision', authenticate, authorizeRoles(['admin', 'safety_inspector']), decideVerification);

module.exports = router;
