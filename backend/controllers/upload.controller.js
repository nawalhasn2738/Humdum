const multer = require('multer');
const {
  storeDocument,
  listListingDocuments,
  downloadDocument,
  reviewDocument,
} = require('../services/upload.service');
const { validateReview } = require('../services/upload-policy.service');

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const DOCUMENT_TYPES = new Set(['identity_verification', 'listing_verification', 'compliance_certificate']);
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes, files: 1, fields: 10, parts: 11 },
  fileFilter(req, file, callback) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const error = new Error('Only PDF, JPG, and PNG files are allowed.');
      error.code = 'INVALID_MIME_TYPE';
      return callback(error);
    }
    return callback(null, true);
  },
});

function isPositiveId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

function validationError(fields) {
  return { error: 'Validation failed.', code: 'VALIDATION_ERROR', fields };
}

function uploadSingleDocument(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File exceeds the ' + Math.round(maxUploadBytes / 1024 / 1024) + ' MB limit.', code: 'FILE_TOO_LARGE' });
    }
    if (error.code === 'INVALID_MIME_TYPE') return res.status(415).json({ error: error.message, code: 'INVALID_FILE_TYPE' });
    console.error('Multipart upload parsing failed:', error.message);
    return res.status(400).json({ error: 'Invalid multipart upload.', code: 'INVALID_UPLOAD' });
  });
}

function getUploadConfig(req, res) {
  return res.json({
    acceptedMimeTypes: [...ALLOWED_MIME_TYPES],
    maxUploadBytes,
    landlordDocumentTypes: ['listing_verification'],
  });
}

async function uploadDocument(req, res) {
  const documentType = req.body.documentType ?? req.body.document_type;
  const subjectUserId = req.body.subjectUserId ?? req.body.subject_user_id;
  const listingId = req.body.listingId ?? req.body.listing_id;
  const auditId = req.body.auditId ?? req.body.audit_id;
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered user profile is required to upload documents.' });
  if (!req.file) return res.status(400).json(validationError({ file: 'A file is required.' }));
  if (!DOCUMENT_TYPES.has(documentType) || (subjectUserId !== undefined && !isPositiveId(subjectUserId)) || (listingId !== undefined && !isPositiveId(listingId)) || (auditId !== undefined && !isPositiveId(auditId)) || (documentType !== 'identity_verification' && !isPositiveId(listingId))) {
    return res.status(400).json(validationError({ documentType: 'A valid document type and target are required.' }));
  }
  try {
    const document = await storeDocument({ file: req.file, uploaderId: req.user.profileId, uploaderRole: req.user.role, target: { documentType, subjectUserId, listingId, auditId } });
    return res.status(201).json({ document });
  } catch (error) {
    if (error.code === 'INVALID_FILE_TYPE') return res.status(415).json({ error: error.message, code: error.code });
    if (error.code === 'UPLOAD_FORBIDDEN') return res.status(403).json({ error: 'You do not have permission to upload for this target.' });
    if (error.code === 'DUPLICATE_EVIDENCE') return res.status(409).json({ error: error.message, code: error.code });
    console.error('Document upload failed:', error.message);
    return res.status(500).json({ error: 'Unable to upload document.' });
  }
}

async function listDocuments(req, res) {
  if (!isPositiveId(req.params.listingId)) return res.status(400).json(validationError({ listingId: 'A valid listing ID is required.' }));
  try {
    const result = await listListingDocuments(req.params.listingId, req.user);
    if (result.kind === 'missing') return res.status(404).json({ error: 'Listing not found.' });
    if (result.kind === 'forbidden') return res.status(403).json({ error: 'You do not have permission to access this listing evidence.' });
    return res.json({ documents: result.documents });
  } catch (error) {
    console.error('Document list failed:', error.message);
    return res.status(500).json({ error: 'Unable to load evidence.' });
  }
}

async function retrieveDocument(req, res) {
  if (!isPositiveId(req.params.id)) return res.status(400).json(validationError({ documentId: 'A valid document ID is required.' }));
  try {
    const result = await downloadDocument(req.params.id, req.user);
    if (result.kind === 'missing') return res.status(404).json({ error: 'Document not found.' });
    if (result.kind === 'forbidden') return res.status(403).json({ error: 'You do not have permission to access this document.' });
    res.set('Content-Type', result.record.mime_type);
    res.set('Content-Length', String(result.data.length));
    res.set('Cache-Control', 'private, no-store');
    res.set('Content-Disposition', 'attachment; filename="' + result.record.original_filename.replace(/["\\\r\n]/g, '_') + '"');
    return res.send(result.data);
  } catch (error) {
    console.error('Document retrieval failed:', error.message);
    return res.status(500).json({ error: 'Unable to retrieve document.' });
  }
}

async function review(req, res) {
  if (!isPositiveId(req.params.id)) return res.status(400).json(validationError({ documentId: 'A valid document ID is required.' }));
  const fields = validateReview(req.body.status, req.body.rejectionReason);
  if (fields) return res.status(400).json(validationError(fields));
  try {
    const document = await reviewDocument(req.params.id, req.user.profileId, req.body.status, req.body.rejectionReason || '');
    if (!document) return res.status(404).json({ error: 'Document not found.' });
    return res.json({ document });
  } catch (error) {
    console.error('Document review failed:', error.message);
    return res.status(500).json({ error: 'Unable to review document.' });
  }
}

module.exports = { getUploadConfig, uploadDocument, uploadSingleDocument, listDocuments, retrieveDocument, review };