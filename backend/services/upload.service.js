const crypto = require('crypto');
const path = require('path');
const pool = require('../db');
const { ensurePrivateBucket, getStorageClient } = require('./storage.service');
const { canAccessDocument, canUploadListingEvidence } = require('./upload-policy.service');

const FILE_SIGNATURES = [
  { mimeType: 'application/pdf', extension: 'pdf', matches: (buffer) => buffer.subarray(0, 5).toString('ascii') === '%PDF-' },
  { mimeType: 'image/jpeg', extension: 'jpg', matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  { mimeType: 'image/png', extension: 'png', matches: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
];

function inspectFile(buffer) {
  return FILE_SIGNATURES.find((signature) => signature.matches(buffer)) || null;
}

function serializeDocument(row) {
  return {
    id: String(row.id),
    documentType: row.document_type,
    subjectUserId: row.subject_user_id ? String(row.subject_user_id) : null,
    listingId: row.listing_id ? String(row.listing_id) : null,
    auditId: row.audit_id ? String(row.audit_id) : null,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    status: row.review_status,
    rejectionReason: row.rejection_reason || null,
    reviewedAt: row.reviewed_at || null,
    createdAt: row.created_at,
  };
}

async function authorizeDocumentTarget({ uploaderId, uploaderRole, documentType, subjectUserId, listingId, auditId }) {
  if (documentType === 'identity_verification') {
    const targetUserId = subjectUserId || uploaderId;
    if (uploaderRole !== 'admin' && String(targetUserId) !== String(uploaderId)) return null;
    const result = await pool.query('SELECT id FROM users WHERE id = $1', [targetUserId]);
    return result.rowCount > 0 ? { subjectUserId: targetUserId } : null;
  }

  if (documentType === 'listing_verification') {
    const result = await pool.query('SELECT id, landlord_id FROM listings WHERE id = $1', [listingId]);
    const listing = result.rows[0];
    if (!listing || !canUploadListingEvidence({ profileId: uploaderId, role: uploaderRole }, listing)) return null;
    return { listingId };
  }

  if (documentType === 'compliance_certificate') {
    if (!['admin', 'safety_inspector'].includes(uploaderRole)) return null;
    const values = [listingId];
    let auditFilter = '';
    if (auditId) {
      values.push(auditId);
      auditFilter = 'AND compliance_audits.id = $2';
    }
    const result = await pool.query(
      `SELECT listings.id AS listing_id, compliance_audits.id AS audit_id
       FROM listings
       LEFT JOIN compliance_audits ON compliance_audits.listing_id = listings.id ` + auditFilter + `
       WHERE listings.id = $1
       ORDER BY compliance_audits.created_at DESC
       LIMIT 1`,
      values
    );
    if (result.rowCount === 0 || (auditId && !result.rows[0].audit_id)) return null;
    return { listingId, auditId: auditId || result.rows[0].audit_id || null };
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

  const authorizedTarget = await authorizeDocumentTarget({ uploaderId, uploaderRole, ...target });
  if (!authorizedTarget) {
    const error = new Error('Document target not found or access denied.');
    error.code = 'UPLOAD_FORBIDDEN';
    throw error;
  }

  const sha256Hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
  if (authorizedTarget.listingId) {
    const duplicate = await pool.query(
      `SELECT id FROM document_uploads
       WHERE listing_id = $1 AND document_type = $2 AND sha256_hash = $3
         AND upload_status = 'available'
         AND review_status IN ('uploaded', 'pending_review', 'accepted')
       LIMIT 1`,
      [authorizedTarget.listingId, target.documentType, sha256Hash]
    );
    if (duplicate.rowCount > 0) {
      const error = new Error('This evidence file has already been uploaded for the listing.');
      error.code = 'DUPLICATE_EVIDENCE';
      throw error;
    }
  }

  const bucket = await ensurePrivateBucket();
  const storage = getStorageClient();
  const now = new Date();
  const objectPath = [target.documentType, String(uploaderId), String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, '0'), crypto.randomUUID() + '.' + signature.extension].join('/');
  const uploadResult = await storage.storage.from(bucket).upload(objectPath, file.buffer, {
    contentType: signature.mimeType,
    cacheControl: 'private, max-age=0, no-store',
    upsert: false,
  });
  if (uploadResult.error) throw uploadResult.error;

  try {
    const originalFilename = path.basename(file.originalname).replace(/[^\x20-\x7e]/g, '_').slice(0, 255);
    const result = await pool.query(
      `INSERT INTO document_uploads (
         uploader_id, document_type, subject_user_id, listing_id, audit_id,
         storage_bucket, object_path, original_filename, mime_type, size_bytes, sha256_hash
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [uploaderId, target.documentType, authorizedTarget.subjectUserId || null, authorizedTarget.listingId || null, authorizedTarget.auditId || null, bucket, objectPath, originalFilename, signature.mimeType, file.size, sha256Hash]
    );
    return serializeDocument(result.rows[0]);
  } catch (error) {
    await storage.storage.from(bucket).remove([objectPath]);
    if (error.code === '23505') {
      error.code = 'DUPLICATE_EVIDENCE';
      error.message = 'This evidence file has already been uploaded for the listing.';
    }
    throw error;
  }
}

async function getDocumentRecord(id) {
  const result = await pool.query(
    `SELECT document_uploads.*, listings.landlord_id
     FROM document_uploads
     LEFT JOIN listings ON listings.id = document_uploads.listing_id
     WHERE document_uploads.id = $1 AND document_uploads.upload_status = 'available'`,
    [id]
  );
  return result.rows[0] || null;
}

async function listListingDocuments(listingId, actor) {
  const listing = await pool.query('SELECT landlord_id FROM listings WHERE id = $1', [listingId]);
  if (listing.rowCount === 0) return { kind: 'missing' };
  const probe = { document_type: 'listing_verification', landlord_id: listing.rows[0].landlord_id };
  if (!canAccessDocument(actor, probe)) return { kind: 'forbidden' };
  const result = await pool.query(
    `SELECT * FROM document_uploads
     WHERE listing_id = $1 AND document_type = 'listing_verification'
       AND upload_status = 'available'
     ORDER BY created_at DESC`,
    [listingId]
  );
  return { kind: 'ok', documents: result.rows.map(serializeDocument) };
}

async function downloadDocument(id, actor) {
  const record = await getDocumentRecord(id);
  if (!record) return { kind: 'missing' };
  if (!canAccessDocument(actor, record)) return { kind: 'forbidden' };
  const storage = getStorageClient();
  const result = await storage.storage.from(record.storage_bucket).download(record.object_path);
  if (result.error) throw result.error;
  return { kind: 'ok', record, data: Buffer.from(await result.data.arrayBuffer()) };
}

async function reviewDocument(id, reviewerId, status, rejectionReason) {
  const result = await pool.query(
    `UPDATE document_uploads
     SET review_status = $1, rejection_reason = $2, reviewed_by = $3, reviewed_at = NOW()
     WHERE id = $4 AND upload_status = 'available'
     RETURNING *`,
    [status, status === 'rejected' ? rejectionReason.trim() : null, reviewerId, id]
  );
  return result.rows[0] ? serializeDocument(result.rows[0]) : null;
}

module.exports = { inspectFile, serializeDocument, storeDocument, listListingDocuments, downloadDocument, reviewDocument };