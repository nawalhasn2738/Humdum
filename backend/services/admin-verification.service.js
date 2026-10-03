const QUEUE_STATUSES = new Set(['pending', 'approved', 'rejected', 'suspended', 'expired']);

function parseQueueParams(query) {
  const status = query.status || 'pending';
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const errors = {};

  if (!QUEUE_STATUSES.has(status)) errors.status = 'Status must be pending, approved, rejected, suspended, or expired.';
  if (!Number.isInteger(page) || page < 1) errors.page = 'Page must be a positive integer.';
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.limit = 'Limit must be between 1 and 100.';

  return Object.keys(errors).length > 0
    ? { errors }
    : { value: { status, page, limit, offset: (page - 1) * limit } };
}

async function getVerificationQueue({ status, page, limit, offset }) {
  const pool = require('../db');
  const result = await pool.query(
    `WITH verification_queue AS (
       SELECT
         listings.id,
         listings.title,
         listings.moderation_status,
         listings.created_at,
         listings.updated_at,
         users.id AS owner_id,
         users.name AS owner_name,
         users.email AS owner_email,
         latest_audit.id AS audit_id,
         latest_audit.audit_score,
         latest_audit.expiry_date,
         latest_audit.created_at AS audit_created_at,
         latest_decision.action_type AS latest_decision_action,
         COALESCE(evidence.documents, '[]'::json) AS documents,
         COALESCE(evidence.submitted_at, listings.updated_at, listings.created_at) AS submitted_at,
         CASE
           WHEN latest_decision.action_type = 'listing.verification.rejected' THEN 'rejected'
           WHEN latest_decision.action_type = 'listing.verification.suspended' THEN 'suspended'
           WHEN latest_audit.expiry_date < CURRENT_DATE THEN 'expired'
           WHEN evidence.latest_review_status = 'rejected' THEN 'rejected'
           WHEN latest_decision.action_type = 'listing.verification.approved'
             AND listings.moderation_status = 'active'
             AND latest_audit.id IS NOT NULL
             AND latest_audit.expiry_date >= CURRENT_DATE
             AND latest_audit.created_at >= listings.updated_at
             AND latest_audit.audit_score >= 80 THEN 'approved'
           ELSE 'pending'
         END AS verification_status
       FROM listings
       INNER JOIN users ON users.id = listings.landlord_id
       LEFT JOIN LATERAL (
         SELECT id, audit_score, expiry_date, created_at
         FROM compliance_audits
         WHERE compliance_audits.listing_id = listings.id
         ORDER BY created_at DESC
         LIMIT 1
       ) latest_audit ON TRUE
       LEFT JOIN LATERAL (
         SELECT action_type
         FROM compliance_audit_logs
         WHERE target_listing_id = listings.id
           AND action_type LIKE 'listing.verification.%'
         ORDER BY id DESC
         LIMIT 1
       ) latest_decision ON TRUE
       LEFT JOIN LATERAL (
         SELECT
           json_agg(
             json_build_object(
               'id', document_uploads.id::text,
               'originalFilename', document_uploads.original_filename,
               'mimeType', document_uploads.mime_type,
               'sizeBytes', document_uploads.size_bytes,
               'status', document_uploads.review_status,
               'rejectionReason', document_uploads.rejection_reason,
               'reviewedAt', document_uploads.reviewed_at,
               'createdAt', document_uploads.created_at
             ) ORDER BY document_uploads.created_at DESC
           ) AS documents,
           (array_agg(document_uploads.review_status ORDER BY document_uploads.created_at DESC))[1] AS latest_review_status,
           MAX(document_uploads.created_at) AS submitted_at
         FROM document_uploads
         WHERE document_uploads.listing_id = listings.id
           AND document_uploads.document_type = 'listing_verification'
           AND document_uploads.upload_status = 'available'
       ) evidence ON TRUE
     )
     SELECT verification_queue.*, COUNT(*) OVER() AS total_count
     FROM verification_queue
     WHERE verification_status = $1
     ORDER BY submitted_at DESC, id DESC
     LIMIT $2 OFFSET $3`,
    [status, limit, offset]
  );

  const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  return {
    items: result.rows.map((row) => ({
      id: String(row.id),
      title: row.title,
      owner: { id: String(row.owner_id), name: row.owner_name, email: row.owner_email },
      moderationStatus: row.moderation_status,
      verificationStatus: row.verification_status,
      submittedAt: row.submitted_at,
      audit: row.audit_id ? {
        id: String(row.audit_id),
        score: Number(row.audit_score),
        expiryDate: row.expiry_date,
        createdAt: row.audit_created_at,
      } : null,
      evidence: row.documents,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

module.exports = { QUEUE_STATUSES, parseQueueParams, getVerificationQueue };