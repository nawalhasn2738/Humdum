const pool = require('../db');
const { approximatePublicLocation } = require('./location-privacy.service');
const { estimateCommute } = require('./routing.service');

async function getListingCommute({ listingId, origin, modes, routing = estimateCommute }) {
  const result = await pool.query(
    `SELECT id, title, ST_Y(geo_point) AS latitude, ST_X(geo_point) AS longitude
       FROM listings
      WHERE id = $1 AND moderation_status = 'active'`,
    [listingId]
  );
  if (result.rows.length === 0) {
    const error = new Error('Listing not found.'); error.code = 'LISTING_NOT_FOUND'; throw error;
  }
  const row = result.rows[0];
  if (row.latitude === null || row.longitude === null) {
    const error = new Error('This listing does not have a usable location.'); error.code = 'LISTING_LOCATION_UNAVAILABLE'; throw error;
  }
  const destination = approximatePublicLocation({ latitude: row.latitude, longitude: row.longitude });
  const route = await routing({ origin, destination, modes });
  return { listing: { id: String(row.id), title: row.title, destination: { ...destination, precision: 'approximate' } }, ...route };
}

module.exports = { getListingCommute };
