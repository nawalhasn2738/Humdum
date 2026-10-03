const ACTIVE_INQUIRY_STATUSES = Object.freeze(['pending', 'accepted']);

function isInquiryParticipant({ actorId, tenantId, landlordId }) {
  return [tenantId, landlordId].some((id) => String(id) === String(actorId));
}

function canInitiateConversation({ actorId, actorRole, tenantId, landlordId, inquiryStatus }) {
  if (!['tenant', 'landlord'].includes(actorRole)) return false;
  if (actorRole === 'tenant' && String(actorId) !== String(tenantId)) return false;
  if (actorRole === 'landlord' && String(actorId) !== String(landlordId)) return false;
  return ACTIVE_INQUIRY_STATUSES.includes(inquiryStatus);
}

function canUseConversation(args) {
  if (args.actorRole === 'admin') return true;
  return isInquiryParticipant(args) && (args.conversationExists || canInitiateConversation(args));
}

module.exports = { ACTIVE_INQUIRY_STATUSES, canInitiateConversation, canUseConversation, isInquiryParticipant };
