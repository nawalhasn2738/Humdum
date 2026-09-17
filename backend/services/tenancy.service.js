const pool = require('../db');

async function rollbackQuietly(client) {
  try {
    await client.query('ROLLBACK');
  } catch (rollbackError) {
    console.error('Tenancy transaction rollback failed:', rollbackError.message);
  }
}

async function createTenancy({ tenantId, listingId, startDate, endDate }) {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const listingResult = await client.query(
      `SELECT id
       FROM listings
       WHERE id = $1
       FOR UPDATE NOWAIT`,
      [listingId]
    );

    if (listingResult.rowCount === 0) {
      const error = new Error('Listing not found.');
      error.code = 'LISTING_NOT_FOUND';
      throw error;
    }

    const conflictResult = await client.query(
      `SELECT id, tenant_id, start_date, end_date
       FROM tenancies
       WHERE listing_id = $1
         AND status = 'active'
         AND daterange(
           start_date,
           COALESCE(end_date, 'infinity'::date),
           '[]'
         ) && daterange(
           $2::date,
           COALESCE($3::date, 'infinity'::date),
           '[]'
         )
       LIMIT 1`,
      [listingId, startDate, endDate]
    );

    if (conflictResult.rowCount > 0) {
      const error = new Error('Listing is already occupied for the requested dates.');
      error.code = 'TENANCY_CONFLICT';
      throw error;
    }

    const result = await client.query(
      `INSERT INTO tenancies (
         tenant_id,
         listing_id,
         start_date,
         end_date,
         status
       )
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, tenant_id, listing_id, start_date, end_date, status, created_at`,
      [tenantId, listingId, startDate, endDate]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    if (client) {
      await rollbackQuietly(client);
    }

    if (error.code === '55P03') {
      const lockError = new Error('Listing is currently being booked. Please retry.');
      lockError.code = 'BOOKING_IN_PROGRESS';
      throw lockError;
    }

    if (error.code === '23P01' || error.code === '23505') {
      const conflictError = new Error(
        'Listing is already occupied for the requested dates.'
      );
      conflictError.code = 'TENANCY_CONFLICT';
      throw conflictError;
    }

    throw error;
  } finally {
    client?.release();
  }
}

module.exports = { createTenancy };
