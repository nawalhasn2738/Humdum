const ACTIVE_INQUIRY_STATUSES = Object.freeze(['pending', 'accepted']);
const INQUIRY_STATUSES = Object.freeze([
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
]);

function actorOwnsInquiry({ actorRole, actorId, tenantId, landlordId }) {
  if (actorRole === 'tenant') return String(tenantId) === String(actorId);
  if (actorRole === 'landlord') return String(landlordId) === String(actorId);
  return false;
}
function canTransitionInquiry({ actorRole, currentStatus, nextStatus }) {
  if (!INQUIRY_STATUSES.includes(nextStatus)) {
    return false;
  }

  if (actorRole === 'tenant') {
    return nextStatus === 'withdrawn' && ACTIVE_INQUIRY_STATUSES.includes(currentStatus);
  }

  if (actorRole === 'landlord') {
    return currentStatus === 'pending' && ['accepted', 'rejected'].includes(nextStatus);
  }

  return false;
}

module.exports = {
  ACTIVE_INQUIRY_STATUSES,
  actorOwnsInquiry,
  INQUIRY_STATUSES,
  canTransitionInquiry,
};
