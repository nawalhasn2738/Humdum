const multer = require('multer');
const { storeDocument } = require('../services/upload.service');

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);
const DOCUMENT_TYPES = new Set([
  'identity_verification',
  'listing_verification',
  'compliance_certificate',
]);
const maxUploadBytes = Number(
  process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxUploadBytes,
    files: 1,
    fields: 10,
    parts: 11,
  },
  fileFilter(req, file, callback) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const error = new Error('Only PDF, JPG, and PNG files are allowed.');
      error.code = 'INVALID_MIME_TYPE';
      return callback(error);
    }

    return callback(null, true);
  },
});

function uploadSingleDocument(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `File exceeds the ${Math.round(maxUploadBytes / 1024 / 1024)} MB limit.`,
      });
    }

    if (error.code === 'INVALID_MIME_TYPE') {
      return res.status(415).json({ error: error.message });
    }

    console.error('Multipart upload parsing failed:', error.message);
    return res.status(400).json({ error: 'Invalid multipart upload.' });
  });
}

function isPositiveId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

async function uploadDocument(req, res) {
  const documentType = req.body.documentType ?? req.body.document_type;
  const subjectUserId = req.body.subjectUserId ?? req.body.subject_user_id;
  const listingId = req.body.listingId ?? req.body.listing_id;
  const auditId = req.body.auditId ?? req.body.audit_id;

  if (!req.user.profileId) {
    return res.status(403).json({
      error: 'A registered user profile is required to upload documents.',
    });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'A file field is required.' });
  }

  if (
    !DOCUMENT_TYPES.has(documentType) ||
    (subjectUserId !== undefined && !isPositiveId(subjectUserId)) ||
    (listingId !== undefined && !isPositiveId(listingId)) ||
    (auditId !== undefined && !isPositiveId(auditId)) ||
    (documentType !== 'identity_verification' && !isPositiveId(listingId))
  ) {
    return res.status(400).json({
      error:
        'A valid documentType and its required subjectUserId, listingId, or auditId must be provided.',
    });
  }

  try {
    const document = await storeDocument({
      file: req.file,
      uploaderId: req.user.profileId,
      uploaderRole: req.user.role,
      target: {
        documentType,
        subjectUserId,
        listingId,
        auditId,
      },
    });

    return res.status(201).json({ document });
  } catch (error) {
    if (error.code === 'INVALID_FILE_TYPE') {
      return res.status(415).json({ error: error.message });
    }

    if (error.code === 'UPLOAD_FORBIDDEN') {
      return res.status(403).json({
        error: 'You do not have permission to upload for this target.',
      });
    }

    console.error('Document upload failed:', error.message);
    return res.status(500).json({ error: 'Unable to upload document.' });
  }
}

module.exports = { uploadDocument, uploadSingleDocument };
