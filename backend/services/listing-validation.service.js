const ACCOMMODATION_TYPES = Object.freeze(['hostel', 'room', 'apartment', 'house']);
const REPORTED_SAFETY_FEATURES = Object.freeze([
  'cctv',
  'guarded_entrance',
  'perimeter_lighting',
  'female_only',
]);

function classifyListingOwnership(listing, landlordId) {
  if (!listing) return 'missing';
  return String(listing.landlord_id) === String(landlordId) ? 'owned' : 'forbidden';
}
function normalizePhone(value) {
  return typeof value === 'string' ? value.replace(/[\s()-]/g, '') : '';
}

function validateListingInput(body = {}) {
  const errors = {};
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const curfewRules = typeof body.curfewRules === 'string' ? body.curfewRules.trim() : '';
  const accommodationType = typeof body.accommodationType === 'string'
    ? body.accommodationType.trim().toLowerCase()
    : '';
  const contactEmail = typeof body.contactEmail === 'string'
    ? body.contactEmail.trim().toLowerCase()
    : '';
  const contactPhone = normalizePhone(body.contactPhone);
  const rent = Number(body.rent);
  const deposit = body.deposit === undefined ? 0 : Number(body.deposit);
  const capacity = Number(body.capacity);
  const latitude = Number(body.latitude ?? body.lat);
  const longitude = Number(body.longitude ?? body.lng);
  const reportedSafetyFeatures = Array.isArray(body.reportedSafetyFeatures)
    ? [...new Set(body.reportedSafetyFeatures)]
    : [];

  if (title.length < 3 || title.length > 255) errors.title = 'Title must be between 3 and 255 characters.';
  if (description.length > 5000) errors.description = 'Description must be 5000 characters or fewer.';
  if (!Number.isFinite(rent) || rent < 0) errors.rent = 'Monthly rent must be a non-negative number.';
  if (!Number.isFinite(deposit) || deposit < 0) errors.deposit = 'Deposit must be a non-negative number.';
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) errors.capacity = 'Capacity must be a whole number between 1 and 100.';
  if (!ACCOMMODATION_TYPES.includes(accommodationType)) errors.accommodationType = 'Choose hostel, room, apartment, or house.';
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) errors.latitude = 'Latitude must be between -90 and 90.';
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) errors.longitude = 'Longitude must be between -180 and 180.';
  if (!/^\S+@\S+\.\S+$/.test(contactEmail) || contactEmail.length > 320) errors.contactEmail = 'Enter a valid contact email.';
  if (!/^\+?[0-9]{10,15}$/.test(contactPhone)) errors.contactPhone = 'Enter a valid contact phone with 10 to 15 digits.';
  if (curfewRules.length > 1000) errors.curfewRules = 'Curfew rules must be 1000 characters or fewer.';
  if (!Array.isArray(body.reportedSafetyFeatures)) {
    errors.reportedSafetyFeatures = 'Reported safety features must be an array.';
  } else if (reportedSafetyFeatures.some((feature) => !REPORTED_SAFETY_FEATURES.includes(feature))) {
    errors.reportedSafetyFeatures = 'One or more reported safety features are invalid.';
  }

  return {
    errors,
    value: {
      title,
      description: description || null,
      rent,
      deposit,
      curfewRules: curfewRules || null,
      latitude,
      longitude,
      capacity,
      accommodationType,
      contactEmail,
      contactPhone,
      reportedSafetyFeatures,
    },
  };
}

module.exports = {
  ACCOMMODATION_TYPES,
  classifyListingOwnership,
  REPORTED_SAFETY_FEATURES,
  validateListingInput,
};
