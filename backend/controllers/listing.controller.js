const pool = require('../db');
const { detectListingAnomalies } = require('../services/anomaly.service');
const { invalidateCachePattern } = require('../services/cache.service');

const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = 100;

function serializeListing(row) {
  return {
    id: String(row.id),
    landlordId: String(row.landlord_id),
    title: row.title,
    description: row.description,
    rent: Number(row.rent),
    deposit: Number(row.deposit),
    curfewRules: row.curfew_rules,
    location:
      row.latitude === null || row.longitude === null
        ? null
        : {
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
          },
    ...(row.distance_km === undefined
      ? {}
      : { distanceKm: Number(row.distance_km) }),
    createdAt: row.created_at,
  };
}

function parseCoordinates(latitudeValue, longitudeValue) {
  if (
    latitudeValue === null ||
    longitudeValue === null ||
    latitudeValue === undefined ||
    longitudeValue === undefined ||
    String(latitudeValue).trim() === '' ||
    String(longitudeValue).trim() === ''
  ) {
    return null;
  }

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

async function createListing(req, res) {
  const { title, description, rent, deposit, curfewRules } = req.body;
  const latitude = req.body.latitude ?? req.body.lat;
  const longitude = req.body.longitude ?? req.body.lng;
  const coordinates = parseCoordinates(latitude, longitude);
  const numericRent = Number(rent);
  const numericDeposit = deposit === undefined ? 0 : Number(deposit);

  if (!req.user.profileId) {
    return res.status(403).json({
      error: 'A registered user profile is required to create a listing.',
    });
  }

  if (
    typeof title !== 'string' ||
    !title.trim() ||
    !Number.isFinite(numericRent) ||
    numericRent < 0 ||
    !Number.isFinite(numericDeposit) ||
    numericDeposit < 0 ||
    !coordinates
  ) {
    return res.status(400).json({
      error:
        'Title, non-negative rent and deposit, and valid latitude/longitude are required.',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO listings (
         landlord_id,
         title,
         description,
         rent,
         deposit,
         curfew_rules,
         geo_point
       )
       VALUES (
         $1, $2, $3, $4, $5, $6,
         ST_SetSRID(ST_MakePoint($7, $8), 4326)
       )
       RETURNING
         id,
         landlord_id,
         title,
         description,
         rent,
         deposit,
         curfew_rules,
         ST_Y(geo_point) AS latitude,
         ST_X(geo_point) AS longitude,
         created_at`,
      [
        req.user.profileId,
        title.trim(),
        typeof description === 'string' ? description.trim() : null,
        numericRent,
        numericDeposit,
        typeof curfewRules === 'string' ? curfewRules.trim() : null,
        coordinates.longitude,
        coordinates.latitude,
      ]
    );

    try {
      await detectListingAnomalies(result.rows[0].id);
    } catch (anomalyError) {
      console.error('Listing anomaly detection failed:', anomalyError.message);
    }

    await invalidateCachePattern('cache:listings:*');

    return res.status(201).json({ listing: serializeListing(result.rows[0]) });
  } catch (error) {
    console.error('Listing creation failed:', error.message);
    return res.status(500).json({ error: 'Unable to create listing.' });
  }
}

async function getListings(req, res) {
  const latitudeValue = req.query.latitude ?? req.query.lat;
  const longitudeValue = req.query.longitude ?? req.query.lng;
  const hasLatitude = latitudeValue !== undefined;
  const hasLongitude = longitudeValue !== undefined;

  if (hasLatitude !== hasLongitude) {
    return res.status(400).json({
      error: 'Latitude and longitude must be provided together.',
    });
  }

  try {
    if (!hasLatitude) {
      const result = await pool.query(
        `SELECT
           id,
           landlord_id,
           title,
           description,
           rent,
           deposit,
           curfew_rules,
           ST_Y(geo_point) AS latitude,
           ST_X(geo_point) AS longitude,
           created_at
         FROM listings
         ORDER BY created_at DESC
         LIMIT 100`
      );

      return res.json({
        listings: result.rows.map(serializeListing),
        meta: { count: result.rows.length },
      });
    }

    const coordinates = parseCoordinates(latitudeValue, longitudeValue);
    const radiusValue = req.query.radiusKm ?? req.query.radius ?? DEFAULT_RADIUS_KM;
    const radiusKm = Number(radiusValue);

    if (
      !coordinates ||
      !Number.isFinite(radiusKm) ||
      radiusKm <= 0 ||
      radiusKm > MAX_RADIUS_KM
    ) {
      return res.status(400).json({
        error: `Coordinates must be valid and radiusKm must be between 0 and ${MAX_RADIUS_KM}.`,
      });
    }

    const result = await pool.query(
      `SELECT
         id,
         landlord_id,
         title,
         description,
         rent,
         deposit,
         curfew_rules,
         ST_Y(geo_point) AS latitude,
         ST_X(geo_point) AS longitude,
         ST_Distance(
           geo_point::geography,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         ) / 1000.0 AS distance_km,
         created_at
       FROM listings
       WHERE geo_point IS NOT NULL
         AND ST_DWithin(
           geo_point::geography,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           $3::double precision * 1000.0
         )
       ORDER BY distance_km ASC
       LIMIT 100`,
      [coordinates.longitude, coordinates.latitude, radiusKm]
    );

    return res.json({
      listings: result.rows.map(serializeListing),
      meta: {
        center: coordinates,
        radiusKm,
        count: result.rows.length,
      },
    });
  } catch (error) {
    console.error('Listing fetch failed:', error.message);
    return res.status(500).json({ error: 'Unable to fetch listings.' });
  }
}

module.exports = { createListing, getListings };




