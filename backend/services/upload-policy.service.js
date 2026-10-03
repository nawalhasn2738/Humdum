const REVIEW_STATUSES = new Set([
  'uploaded',
  'pending_review',
  'accepted',
  'rejected',
]);

function canAccessDocument(actor, document) {
  if (!actor?.profileId || !actor.role || !document) return false;
  if (['admin', 'safety_inspector'].includes(actor.role)) return true;

  if (document.document_type === 'identity_verification') {
    return String(document.subject_user_id) === String(actor.profileId);
  }

  return (
    document.document_type === 'listing_verification' &&
    actor.role === 'landlord' &&
    String(document.landlord_id) === String(actor.profileId)
  );
}


function canUploadListingEvidence(actor, listing) {
  if (!actor?.profileId || !actor.role || !listing) return false;
  if (actor.role === 'admin') return true;
  return (
    actor.role === 'landlord' &&
    String(listing.landlord_id) === String(actor.profileId)
  );
}
function validateReview(status, rejectionReason) {
  if (!['accepted', 'rejected'].includes(status)) {
    return { status: 'Review status must be accepted or rejected.' };
  }

  const reason = typeof rejectionReason === 'string' ? rejectionReason.trim() : '';
  if (status === 'rejected' && !reason) {
    return { rejectionReason: 'A rejection reason is required.' };
  }
  if (reason.length > 1000) {
    return { rejectionReason: 'Rejection reason must be 1000 characters or fewer.' };
  }

  return null;
}

module.exports = {
  REVIEW_STATUSES,
  canAccessDocument,
  canUploadListingEvidence,
  validateReview,
};
