const express = require('express');
const { getAuditLogs } = require('../controllers/audit-log.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/:listingId', authenticate, authorizeRoles(['admin']), getAuditLogs);

module.exports = router;
