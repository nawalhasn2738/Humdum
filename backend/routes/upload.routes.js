const express = require('express');
const {
  getUploadConfig,
  uploadDocument,
  uploadSingleDocument,
  listDocuments,
  retrieveDocument,
  review,
} = require('../controllers/upload.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/config', authenticate, getUploadConfig);
router.get('/listing/:listingId', authenticate, listDocuments);
router.get('/document/:id', authenticate, retrieveDocument);
router.patch(
  '/document/:id/review',
  authenticate,
  authorizeRoles(['admin', 'safety_inspector']),
  review
);
router.post(
  '/document',
  authenticate,
  authorizeRoles(['tenant', 'landlord', 'admin', 'safety_inspector']),
  uploadSingleDocument,
  uploadDocument
);

module.exports = router;