const express = require('express');
const {
  uploadDocument,
  uploadSingleDocument,
} = require('../controllers/upload.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/document',
  authenticate,
  authorizeRoles(['tenant', 'landlord', 'admin', 'safety_inspector']),
  uploadSingleDocument,
  uploadDocument
);

module.exports = router;
