const crypto = require('crypto');
const path = require('path');
const pool = require('../db');
const {
  ensurePrivateBucket,
  getStorageClient,
} = require('./storage.service');

const FILE_SIGNATURES = [
  {
    mimeType: 'application/pdf',
    extension: 'pdf',
    matches: (buffer) => buffer.subarray(0, 5).toString('ascii') === '%PDF-',
  },
  {
    mimeType: 'image/jpeg',
    extension: 'jpg',
    matches: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  {
    mimeType: 'image/png',
    extension: 'png',
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      ),
  },
];

function inspectFile(buffer) {
  return FILE_SIGNATURES.find((signature) => signature.matches(buffer)) || null;
}

async function authorizeDocumentTarget({
  uploaderId,
  uploaderRole,
  documentType,
  subjectUserId,
  listingId,
  auditId,
}) {
  if (documentType === 'identity_verification') {
    const targetUserId = subjectUserId || uploaderId;

    if (uploaderRole !== 'admin' && String(targetUserId) !== String(uploaderId)) {
      return null;
    }

    const result = await pool.query('SELECT id FROM users WHERE id = $1', [
      targetUserId,
    ]);
    return result.rowCount > 0 ? { subjectUserId: targetUserId } : null;
  }

  if (documentType === 'listing_verification') {
    const result = await pool.query(
      'SELECT id, landlord_id FROM listings WHERE id = $1',
      [listingId]
    );
    const listing = result.rows[0];

    if (
      !listing ||
      (uploaderRole !== 'admin' &&
        !(
          uploaderRole === 'landlord' &&
          String(listing.landlord_id) === String(uploaderId)
        ))
    ) {
      return null;
    }

    return { listingId };
  }

  if (documentType === 'compliance_certificate') {
    if (!['admin', 'safety_inspector'].includes(uploaderRole)) {
      return null;
    }

    const values = [listingId];
    let auditFilter = '';
    if (auditId) {
      values.push(auditId);
      auditFilter = 'AND compliance_audits.id = $2';
    }

    const result = await pool.query(
      `SELECT listings.id AS listing_id, compliance_audits.id AS audit_id
       FROM listings
       LEFT JOIN compliance_audits
         ON compliance_audits.listing_id = listings.id
         ${auditFilter}
       WHERE listings.id = $1
       ORDER BY compliance_audits.created_at DESC
       LIMIT 1`,
      values
    );

    if (result.rowCount === 0 || (auditId && !result.rows[0].audit_id)) {
      return null;
    }

    return {
      listingId,
      auditId: auditId || result.rows[0].audit_id || null,
    };
  }

  return null;
}

async function storeDocument({ file, uploaderId, uploaderRole, target }) {
  const signature = inspectFile(file.buffer);

  if (!signature || signature.mimeType !== file.mimetype) {
    const error = new Error('File content does not match an allowed format.');
    error.code = 'INVALID_FILE_TYPE';
    throw error;
  }

  const authorizedTarget = await authorizeDocumentTarget({
    uploaderId,
    uploaderRole,
    ...target,
  });

  if (!authorizedTarget) {
    const error = new Error('Document target not found or access denied.');
    error.code = 'UPLOAD_FORBIDDEN';
    throw error;
  }

  const bucket = await ensurePrivateBucket();
  const storage = getStorageClient();
  const now = new Date();
  const objectPath = [
    target.documentType,
    String(uploaderId),
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    `${crypto.randomUUID()}.${signature.extension}`,
  ].join('/');
  const sha256Hash = crypto
    .createHash('sha256')
    .update(file.buffer)
    .digest('hex');
  const uploadResult = await storage.storage.from(bucket).upload(
    objectPath,
    file.buffer,
    {
      contentType: signature.mimeType,
      cacheControl: 'private, max-age=0, no-store',
      upsert: false,
    }
  );

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  let record;
  try {
    const originalFilename = path
      .basename(file.originalname)
      .replace(/[^\\x20-\\x7e]/g, '_')
      .slice(0, 255);
    const result = await pool.query(
      `INSERT INTO document_uploads (
         uploader_id,
         document_type,
         subject_user_id,
         listing_id,
         audit_id,
         storage_bucket,
         object_path,
         original_filename,
         mime_type,
         size_bytes,
         sha256_hash
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        uploaderId,
        target.documentType,
        authorizedTarget.subjectUserId || null,
        authorizedTarget.listingId || null,
        authorizedTarget.auditId || null,
        bucket,
        objectPath,
        originalFilename,
        signature.mimeType,
        file.size,
        sha256Hash,
      ]
    );
    record = result.rows[0];
  } catch (error) {
    await storage.storage.from(bucket).remove([objectPath]);
    throw error;
  }

  const signedUrlTtlSeconds = Math.min(
    3600,
    Math.max(60, Number(process.env.SIGNED_URL_TTL_SECONDS || 300))
  );
  const signedUrlResult = await storage.storage
    .from(bucket)
    .createSignedUrl(objectPath, signedUrlTtlSeconds);

  return {
    id: String(record.id),
    documentType: record.document_type,
    subjectUserId: record.subject_user_id
      ? String(record.subject_user_id)
      : null,
    listingId: record.listing_id ? String(record.listing_id) : null,
    auditId: record.audit_id ? String(record.audit_id) : null,
    originalFilename: record.original_filename,
    mimeType: record.mime_type,
    sizeBytes: Number(record.size_bytes),
    sha256Hash: record.sha256_hash,
    signedUrl: signedUrlResult.error ? null : signedUrlResult.data.signedUrl,
    signedUrlExpiresIn: signedUrlTtlSeconds,
    createdAt: record.created_at,
  };
}

module.exports = { inspectFile, storeDocument };


