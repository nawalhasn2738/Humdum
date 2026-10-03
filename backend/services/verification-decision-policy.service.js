const DECISIONS = new Set(['approve', 'reject', 'suspend']);

function validateDecisionInput(input) {
  const decision = input?.decision;
  const reason = typeof input?.reason === 'string' ? input.reason.trim() : '';
  const errors = {};

  if (!DECISIONS.has(decision)) errors.decision = 'Decision must be approve, reject, or suspend.';
  if (['reject', 'suspend'].includes(decision) && !reason) errors.reason = 'A reason is required for this decision.';
  if (reason.length > 1000) errors.reason = 'Reason must be 1000 characters or fewer.';

  return Object.keys(errors).length > 0 ? { errors } : { value: { decision, reason: reason || null } };
}

function transitionForDecision(currentStatus, decision) {
  if (currentStatus === 'suspended') return { error: 'SUSPENDED_LISTING' };
  if (decision === 'suspend') {
    return currentStatus === 'active'
      ? { nextStatus: 'suspended' }
      : { error: 'INVALID_TRANSITION' };
  }
  if (currentStatus !== 'under_review') return { error: 'ALREADY_DECIDED' };
  return { nextStatus: decision === 'approve' ? 'active' : 'suspended' };
}

function isApprovalAuditValid(audit, listingUpdatedAt, now = new Date()) {
  if (!audit) return false;
  const expiry = new Date(String(audit.expiry_date).slice(0, 10) + 'T23:59:59.999Z');
  return (
    Number(audit.audit_score) >= 80 &&
    expiry.getTime() >= now.getTime() &&
    new Date(audit.created_at).getTime() >= new Date(listingUpdatedAt).getTime()
  );
}

module.exports = { DECISIONS, validateDecisionInput, transitionForDecision, isApprovalAuditValid };