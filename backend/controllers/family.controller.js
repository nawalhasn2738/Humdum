const {
  getFamilyProfile,
  upsertFamilyProfile,
} = require('../services/family.service');

const E164_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const MAX_PREFERENCES_SIZE = 5000;

function isPositiveId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

async function saveFamilyProfile(req, res) {
  const emergencyContact = req.body.emergencyContact;
  const guardianPhones = req.body.guardianPhones;
  const checkInPreferences = req.body.checkInPreferences ?? {};
  const listingId = req.body.listingId;

  if (!req.user.profileId) {
    return res.status(403).json({
      error: 'A registered tenant profile is required.',
    });
  }

  if (
    !emergencyContact ||
    typeof emergencyContact.name !== 'string' ||
    !emergencyContact.name.trim() ||
    typeof emergencyContact.relationship !== 'string' ||
    !emergencyContact.relationship.trim() ||
    !guardianPhones ||
    !E164_PHONE_PATTERN.test(guardianPhones.primary || '') ||
    (guardianPhones.secondary &&
      !E164_PHONE_PATTERN.test(guardianPhones.secondary)) ||
    (listingId !== undefined && !isPositiveId(listingId)) ||
    !checkInPreferences ||
    typeof checkInPreferences !== 'object' ||
    Array.isArray(checkInPreferences) ||
    JSON.stringify(checkInPreferences).length > MAX_PREFERENCES_SIZE
  ) {
    return res.status(400).json({
      error:
        'Valid emergency contact, E.164 guardian phone numbers, optional listingId, and check-in preferences are required.',
    });
  }

  try {
    const profile = await upsertFamilyProfile(req.user.profileId, {
      listingId,
      emergencyContactName: emergencyContact.name.trim(),
      emergencyContactRelationship: emergencyContact.relationship.trim(),
      guardianPhone: guardianPhones.primary,
      secondaryGuardianPhone: guardianPhones.secondary || null,
      checkInPreferences,
    });

    return res.status(201).json({ profile });
  } catch (error) {
    if (error.code === 'ACTIVE_TENANCY_REQUIRED') {
      return res.status(403).json({
        error: 'An active tenancy is required to create a family profile.',
      });
    }

    console.error('Family profile save failed:', error.message);
    return res.status(500).json({ error: 'Unable to save family profile.' });
  }
}

async function getFamilyProfileByUser(req, res) {
  if (!req.user.profileId) {
    return res.status(403).json({
      error: 'A registered user profile is required.',
    });
  }

  if (!isPositiveId(req.params.userId)) {
    return res.status(400).json({ error: 'A valid user ID is required.' });
  }

  try {
    const result = await getFamilyProfile({
      requestedUserId: req.params.userId,
      actorId: req.user.profileId,
      actorRole: req.user.role,
    });

    if (!result.found) {
      return res.status(404).json({ error: 'Family profile not found.' });
    }

    if (!result.authorized) {
      return res.status(403).json({
        error: 'You do not have permission to access this family profile.',
      });
    }

    return res.json({
      profile: result.profile,
      accessReason: result.accessReason,
    });
  } catch (error) {
    console.error('Family profile fetch failed:', error.message);
    return res.status(500).json({ error: 'Unable to fetch family profile.' });
  }
}

module.exports = { getFamilyProfileByUser, saveFamilyProfile };
