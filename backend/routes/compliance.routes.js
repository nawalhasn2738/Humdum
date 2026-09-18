const express = require('express');
const { saveAudit, getAudit } = require('../controllers/compliance.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/:id/audit', getAudit);
router.post(
  '/:id/audit',
  authenticate,
  authorizeRoles(['admin', 'safety_inspector']),
  saveAudit
);

module.exports = router;
