const pool = require('../db');
const { detectListingAnomalies } = require('../services/anomaly.service');
const { invalidateCachePattern } = require('../services/cache.service');
const { classifyListingOwnership, validateListingInput } = require('../services/listing-validation.service');
const { PUBLIC_LISTING_STATUS, canAccessManagedListing } = require('../services/listing-visibility.service');
const { PUBLIC_COORDINATE_GRID_DEGREES, approximatePublicLocation } = require('../services/location-privacy.service');

const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = 100;

function isPositiveId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

function serializeListing(row, { publicView = false } = {}) {
  return {
    id: String(row.id),
    landlordId: String(row.landlord_id),
    title: row.title,
    description: row.description,
    rent: Number(row.rent),
    deposit: Number(row.deposit),
    curfewRules: row.curfew_rules,
    capacity: row.capacity === null ? null : Number(row.capacity),
    accommodationType: row.accommodation_type,
    contact: {
      email: row.contact_email,
      phone: row.contact_phone,
    },
    reportedSafetyFeatures: row.reported_safety_features || [],
    location: row.latitude === null || row.longitude === null
      ? null
      : publicView
        ? approximatePublicLocation({ latitude: row.latitude, longitude: row.longitude })
        : { latitude: Number(row.latitude), longitude: Number(row.longitude) },
    ...(row.distance_km === undefined ? {} : { distanceKm: Number(row.distance_km) }),
    ...(row.moderation_status === undefined ? {} : { moderationStatus: row.moderation_status }),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function validationFailure(res, fields) {
  return res.status(400).json({
    error: 'Validation failed.',
    code: 'VALIDATION_ERROR',
    fields,
  });
}

function listingColumns(prefix = '') {
  const p = prefix ? `${prefix}.` : '';
  return `
    ${p}id,
    ${p}landlord_id,
    ${p}title,
    ${p}description,
    ${p}rent,
    ${p}deposit,
    ${p}curfew_rules,
    ${p}capacity,
    ${p}accommodation_type,
    ${p}contact_email,
    ${p}contact_phone,
    ${p}reported_safety_features,
    ${p}moderation_status,
    ST_Y(${p}geo_point) AS latitude,
    ST_X(${p}geo_point) AS longitude,
    ${p}created_at,
    ${p}updated_at`;
}

async function runAnomalyDetection(listingId) {
  try {
    await detectListingAnomalies(listingId);
  } catch (error) {
    console.error('Listing anomaly detection failed:', error.message);
  }
}

async function identifyOwnership(listingId, landlordId) {
  const result = await pool.query('SELECT landlord_id FROM listings WHERE id = $1', [listingId]);
  return classifyListingOwnership(result.rows[0], landlordId);
}

async function createListing(req, res) {
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered landlord profile is required.' });
  const { errors, value } = validateListingInput(req.body);
  if (Object.keys(errors).length > 0) return validationFailure(res, errors);

  try {
    const result = await pool.query(
      `INSERT INTO listings (
         landlord_id, title, description, rent, deposit, curfew_rules,
         capacity, accommodation_type, contact_email, contact_phone,
         reported_safety_features, geo_point, moderation_status, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
         ST_SetSRID(ST_MakePoint($12, $13), 4326), 'under_review', NOW()
       ) RETURNING ${listingColumns()}`,
      [
        req.user.profileId, value.title, value.description, value.rent,
        value.deposit, value.curfewRules, value.capacity,
        value.accommodationType, value.contactEmail, value.contactPhone,
        value.reportedSafetyFeatures, value.longitude, value.latitude,
      ]
    );
    await runAnomalyDetection(result.rows[0].id);
    await invalidateCachePattern('cache:listings:*');
    return res.status(201).json({ listing: serializeListing(result.rows[0]) });
  } catch (error) {
    console.error('Listing creation failed:', error.message);
    return res.status(500).json({ error: 'Unable to create listing.' });
  }
}

async function updateListing(req, res) {
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered landlord profile is required.' });
  if (!isPositiveId(req.params.id)) return validationFailure(res, { id: 'A valid listing ID is required.' });
  const { errors, value } = validateListingInput(req.body);
  if (Object.keys(errors).length > 0) return validationFailure(res, errors);

  try {
    const result = await pool.query(
      `UPDATE listings SET
         title = $1,
         description = $2,
         rent = $3,
         deposit = $4,
         curfew_rules = $5,
         capacity = $6,
         accommodation_type = $7,
         contact_email = $8,
         contact_phone = $9,
         reported_safety_features = $10,
         geo_point = ST_SetSRID(ST_MakePoint($11, $12), 4326),
         moderation_status = 'under_review',
         updated_at = NOW()
       WHERE id = $13 AND landlord_id = $14
       RETURNING ${listingColumns()}`,
      [
        value.title, value.description, value.rent, value.deposit,
        value.curfewRules, value.capacity, value.accommodationType,
        value.contactEmail, value.contactPhone, value.reportedSafetyFeatures,
        value.longitude, value.latitude, req.params.id, req.user.profileId,
      ]
    );

    if (result.rowCount === 0) {
      const ownership = await identifyOwnership(req.params.id, req.user.profileId);
      return ownership === 'missing'
        ? res.status(404).json({ error: 'Listing not found.' })
        : res.status(403).json({ error: 'You cannot edit a listing owned by another landlord.' });
    }

    await runAnomalyDetection(result.rows[0].id);
    await invalidateCachePattern('cache:listings:*');
    await invalidateCachePattern(`cache:safety-score:/api/listings/${req.params.id}/safety-score*`);
    return res.json({ listing: serializeListing(result.rows[0]) });
  } catch (error) {
    console.error('Listing update failed:', error.message);
    return res.status(500).json({ error: 'Unable to update listing.' });
  }
}

async function deactivateListing(req, res) {
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered landlord profile is required.' });
  if (!isPositiveId(req.params.id)) return validationFailure(res, { id: 'A valid listing ID is required.' });

  try {
    const result = await pool.query(
      `UPDATE listings
       SET moderation_status = 'suspended', updated_at = NOW()
       WHERE id = $1 AND landlord_id = $2
       RETURNING ${listingColumns()}`,
      [req.params.id, req.user.profileId]
    );
    if (result.rowCount === 0) {
      const ownership = await identifyOwnership(req.params.id, req.user.profileId);
      return ownership === 'missing'
        ? res.status(404).json({ error: 'Listing not found.' })
        : res.status(403).json({ error: 'You cannot deactivate a listing owned by another landlord.' });
    }
    await invalidateCachePattern('cache:listings:*');
    await invalidateCachePattern('cache:safety-score:/api/listings/' + req.params.id + '/safety-score*');
    return res.json({ listing: serializeListing(result.rows[0]) });
  } catch (error) {
    console.error('Listing deactivation failed:', error.message);
    return res.status(500).json({ error: 'Unable to deactivate listing.' });
  }
}

async function getListings(req, res) {
  const latitudeValue = req.query.latitude ?? req.query.lat;
  const longitudeValue = req.query.longitude ?? req.query.lng;
  const hasLatitude = latitudeValue !== undefined;
  const hasLongitude = longitudeValue !== undefined;
  if (hasLatitude !== hasLongitude) return validationFailure(res, { location: 'Latitude and longitude must be provided together.' });

  try {
    if (!hasLatitude) {
      const result = await pool.query(
        `SELECT ${listingColumns()}
         FROM listings
         WHERE moderation_status = $1
         ORDER BY created_at DESC LIMIT 100`,
        [PUBLIC_LISTING_STATUS]
      );
      return res.json({ listings: result.rows.map((row) => serializeListing(row, { publicView: true })), meta: { count: result.rows.length } });
    }

    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);
    const radiusKm = Number(req.query.radiusKm ?? req.query.radius ?? DEFAULT_RADIUS_KM);
    const fields = {};
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) fields.latitude = 'Latitude must be between -90 and 90.';
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) fields.longitude = 'Longitude must be between -180 and 180.';
    if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > MAX_RADIUS_KM) fields.radiusKm = `Radius must be between 0 and ${MAX_RADIUS_KM} km.`;
    if (Object.keys(fields).length > 0) return validationFailure(res, fields);

    const result = await pool.query(
      `SELECT ${listingColumns()},
         ST_Distance(ST_SnapToGrid(geo_point, $5)::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000.0 AS distance_km
       FROM listings
       WHERE geo_point IS NOT NULL
         AND moderation_status = $4
         AND ST_DWithin(geo_point::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3::double precision * 1000.0)
       ORDER BY distance_km ASC LIMIT 100`,
      [longitude, latitude, radiusKm, PUBLIC_LISTING_STATUS, PUBLIC_COORDINATE_GRID_DEGREES]
    );
    return res.json({
      listings: result.rows.map((row) => serializeListing(row, { publicView: true })),
      meta: { center: { latitude, longitude }, radiusKm, count: result.rows.length },
    });
  } catch (error) {
    console.error('Listing fetch failed:', error.message);
    return res.status(500).json({ error: 'Unable to fetch listings.' });
  }
}

async function getLandlordListings(req, res) {
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered landlord profile is required.' });
  try {
    const result = await pool.query(
      `SELECT ${listingColumns('listings')},
         latest_audit.audit_score AS safety_score,
         COUNT(tenancies.id) FILTER (WHERE tenancies.status = 'active')::int AS bookings
       FROM listings
       LEFT JOIN LATERAL (
         SELECT audit_score FROM compliance_audits
         WHERE compliance_audits.listing_id = listings.id
         ORDER BY created_at DESC, id DESC LIMIT 1
       ) latest_audit ON TRUE
       LEFT JOIN tenancies ON tenancies.listing_id = listings.id
       WHERE listings.landlord_id = $1
       GROUP BY listings.id, latest_audit.audit_score
       ORDER BY listings.created_at DESC`,
      [req.user.profileId]
    );
    return res.json({ listings: result.rows.map((row) => ({
      ...serializeListing(row),
      moderationStatus: row.moderation_status,
      safetyScore: row.safety_score === null ? null : Number(row.safety_score),
      bookings: Number(row.bookings),
    })) });
  } catch (error) {
    console.error('Landlord listing fetch failed:', error.message);
    return res.status(500).json({ error: 'Unable to fetch landlord listings.' });
  }
}

async function getOwnedListing(req, res) {
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered landlord profile is required.' });
  if (!isPositiveId(req.params.id)) return validationFailure(res, { id: 'A valid listing ID is required.' });
  try {
    const result = await pool.query(
      `SELECT ${listingColumns()} FROM listings WHERE id = $1 AND landlord_id = $2 LIMIT 1`,
      [req.params.id, req.user.profileId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found.' });
    return res.json({ listing: serializeListing(result.rows[0]) });
  } catch (error) {
    console.error('Owned listing fetch failed:', error.message);
    return res.status(500).json({ error: 'Unable to fetch listing.' });
  }
}

async function getManagedListing(req, res) {
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered management profile is required.' });
  if (!isPositiveId(req.params.id)) return validationFailure(res, { id: 'A valid listing ID is required.' });

  try {
    const result = await pool.query(
      `SELECT ${listingColumns()} FROM listings WHERE id = $1 LIMIT 1`,
      [req.params.id]
    );
    const listing = result.rows[0];
    if (!listing || !canAccessManagedListing(req.user, listing)) {
      return res.status(404).json({ error: 'Listing not found.' });
    }
    return res.json({ listing: serializeListing(listing) });
  } catch (error) {
    console.error('Managed listing fetch failed:', error.message);
    return res.status(500).json({ error: 'Unable to fetch listing.' });
  }
}

async function getListingById(req, res) {
  if (!isPositiveId(req.params.id)) return validationFailure(res, { id: 'A valid listing ID is required.' });
  try {
    const result = await pool.query(
      `SELECT ${listingColumns()} FROM listings WHERE id = $1 AND moderation_status = $2 LIMIT 1`,
      [req.params.id, PUBLIC_LISTING_STATUS]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found.' });
    return res.json({ listing: serializeListing(result.rows[0], { publicView: true }) });
  } catch (error) {
    console.error('Listing detail fetch failed:', error.message);
    return res.status(500).json({ error: 'Unable to fetch listing.' });
  }
}

module.exports = {
  createListing,
  deactivateListing,
  getLandlordListings,
  getListingById,
  getManagedListing,
  getListings,
  getOwnedListing,
  updateListing,
};
