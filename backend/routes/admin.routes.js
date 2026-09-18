const express = require('express');
const { getAnomalies } = require('../controllers/anomaly.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/anomalies', authenticate, authorizeRoles(['admin']), getAnomalies);

module.exports = router;
