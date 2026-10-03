const PUBLIC_LISTING_STATUS = 'active';

function isListingPublic(listing) {
  return listing?.moderation_status === PUBLIC_LISTING_STATUS;
}

function canAccessManagedListing(actor, listing) {
  if (!actor?.profileId || !actor.role || !listing) return false;
  if (actor.role === 'admin' || actor.role === 'safety_inspector') return true;
  return actor.role === 'landlord' && String(actor.profileId) === String(listing.landlord_id);
}

module.exports = { PUBLIC_LISTING_STATUS, isListingPublic, canAccessManagedListing };