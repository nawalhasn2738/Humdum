const pool = require('../db');
const { logComplianceAction } = require('./audit-trail.service');
const { transitionForDecision, isApprovalAuditValid } = require('./verification-decision-policy.service');

function decisionError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function decideListingVerification({ listingId, actorId, decision, reason }) {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [listingId]);

    const listingResult = await client.query(
      `SELECT id, title, moderation_status, updated_at
       FROM listings
       WHERE id = $1
       FOR UPDATE`,
      [listingId]
    );
    if (listingResult.rowCount === 0) throw decisionError('LISTING_NOT_FOUND', 'Listing not found.');

    const listing = listingResult.rows[0];
    const transition = transitionForDecision(listing.moderation_status, decision);
    if (transition.error === 'SUSPENDED_LISTING') throw decisionError('STATUS_CONFLICT', 'A suspended listing cannot receive another decision.');
    if (transition.error === 'ALREADY_DECIDED') throw decisionError('STATUS_CONFLICT', 'This listing has already been approved.');
    if (transition.error) throw decisionError('STATUS_CONFLICT', 'This decision is not valid for the listing current status.');

    let audit = null;
    if (decision === 'approve') {
      const auditResult = await client.query(
        `SELECT id, audit_score, expiry_date, created_at
         FROM compliance_audits
         WHERE listing_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [listingId]
      );
      audit = auditResult.rows[0] || null;
      if (!isApprovalAuditValid(audit, listing.updated_at)) {
        throw decisionError('INVALID_APPROVAL_AUDIT', 'Approval requires a current post-edit safety audit with a score of at least 80.');
      }
    }

    const updatedResult = await client.query(
      `UPDATE listings
       SET moderation_status = $1
       WHERE id = $2 AND moderation_status = $3
       RETURNING id, title, moderation_status, updated_at`,
      [transition.nextStatus, listingId, listing.moderation_status]
    );
    if (updatedResult.rowCount !== 1) throw decisionError('CONCURRENT_DECISION', 'The listing changed while this decision was being processed.');

    if (decision === 'approve') {
      await client.query(
        `UPDATE document_uploads
         SET review_status = 'accepted', rejection_reason = NULL,
             reviewed_by = $1, reviewed_at = NOW()
         WHERE listing_id = $2
           AND document_type = 'listing_verification'
           AND upload_status = 'available'
           AND review_status IN ('uploaded', 'pending_review')`,
        [actorId, listingId]
      );
    } else if (decision === 'reject') {
      await client.query(
        `UPDATE document_uploads
         SET review_status = 'rejected', rejection_reason = $1,
             reviewed_by = $2, reviewed_at = NOW()
         WHERE listing_id = $3
           AND document_type = 'listing_verification'
           AND upload_status = 'available'
           AND review_status IN ('uploaded', 'pending_review')`,
        [reason, actorId, listingId]
      );
    }

    const log = await logComplianceAction(client, {
      actorId,
      actionType: 'listing.verification.' + (decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'suspended'),
      targetListingId: listingId,
      previousState: { moderationStatus: listing.moderation_status },
      newState: {
        moderationStatus: transition.nextStatus,
        decision,
        reason,
        auditId: audit ? String(audit.id) : null,
      },
    });

    await client.query('COMMIT');
    return {
      listing: {
        id: String(updatedResult.rows[0].id),
        title: updatedResult.rows[0].title,
        moderationStatus: updatedResult.rows[0].moderation_status,
        updatedAt: updatedResult.rows[0].updated_at,
      },
      decision,
      reason,
      decidedAt: log.created_at,
    };
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    throw error;
  } finally {
    client?.release();
  }
}

module.exports = { decideListingVerification };