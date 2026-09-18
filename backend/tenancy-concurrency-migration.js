require('dotenv').config();

const pool = require('./db');

const migration = `
  CREATE EXTENSION IF NOT EXISTS btree_gist;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'tenancies_no_overlapping_active_bookings'
        AND conrelid = 'tenancies'::regclass
    ) THEN
      ALTER TABLE tenancies
        ADD CONSTRAINT tenancies_no_overlapping_active_bookings
        EXCLUDE USING GIST (
          listing_id WITH =,
          daterange(
            start_date,
            COALESCE(end_date, 'infinity'::date),
            '[]'
          ) WITH &&
        )
        WHERE (status = 'active');
    END IF;
  END
  $$;
`;

async function migrateTenancyConcurrency() {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Tenancy concurrency migration completed successfully.');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Tenancy concurrency migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}

migrateTenancyConcurrency();
