require('dotenv').config();

const pool = require('./db');

const migration = `
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'users_role_check'
        AND conrelid = 'users'::regclass
        AND pg_get_constraintdef(oid) NOT LIKE '%safety_inspector%'
    ) THEN
      ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'users_role_check'
        AND conrelid = 'users'::regclass
    ) THEN
      ALTER TABLE users
        ADD CONSTRAINT users_role_check
        CHECK (role IN ('tenant', 'landlord', 'admin', 'safety_inspector'));
    END IF;
  END
  $$;
  CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx
    ON users (phone)
    WHERE phone IS NOT NULL;

  CREATE INDEX IF NOT EXISTS listings_geo_point_gist_idx
    ON listings USING GIST (geo_point);

  CREATE INDEX IF NOT EXISTS listings_geo_point_geography_gist_idx
    ON listings USING GIST ((geo_point::geography));

  CREATE UNIQUE INDEX IF NOT EXISTS tenancies_unique_active_period_idx
    ON tenancies (
      tenant_id,
      listing_id,
      start_date,
      COALESCE(end_date, 'infinity'::date)
    )
    WHERE status = 'active';

  CREATE UNIQUE INDEX IF NOT EXISTS reviews_tenancy_id_unique_idx
    ON reviews (tenancy_id);
  CREATE INDEX IF NOT EXISTS messages_listing_thread_idx
    ON messages (listing_id, created_at, id);

  CREATE INDEX IF NOT EXISTS messages_sender_listing_idx
    ON messages (sender_id, listing_id);

  CREATE INDEX IF NOT EXISTS messages_receiver_listing_idx
    ON messages (receiver_id, listing_id);

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'listings_landlord_id_fkey'
        AND conrelid = 'listings'::regclass
    ) THEN
      ALTER TABLE listings
        ADD CONSTRAINT listings_landlord_id_fkey
        FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'compliance_audits_listing_id_fkey'
        AND conrelid = 'compliance_audits'::regclass
    ) THEN
      ALTER TABLE compliance_audits
        ADD CONSTRAINT compliance_audits_listing_id_fkey
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'tenancies_tenant_id_fkey'
        AND conrelid = 'tenancies'::regclass
    ) THEN
      ALTER TABLE tenancies
        ADD CONSTRAINT tenancies_tenant_id_fkey
        FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'tenancies_listing_id_fkey'
        AND conrelid = 'tenancies'::regclass
    ) THEN
      ALTER TABLE tenancies
        ADD CONSTRAINT tenancies_listing_id_fkey
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'reviews_tenancy_id_fkey'
        AND conrelid = 'reviews'::regclass
    ) THEN
      ALTER TABLE reviews
        ADD CONSTRAINT reviews_tenancy_id_fkey
        FOREIGN KEY (tenancy_id) REFERENCES tenancies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'messages_sender_id_fkey'
        AND conrelid = 'messages'::regclass
    ) THEN
      ALTER TABLE messages
        ADD CONSTRAINT messages_sender_id_fkey
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'messages_receiver_id_fkey'
        AND conrelid = 'messages'::regclass
    ) THEN
      ALTER TABLE messages
        ADD CONSTRAINT messages_receiver_id_fkey
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'messages_listing_id_fkey'
        AND conrelid = 'messages'::regclass
    ) THEN
      ALTER TABLE messages
        ADD CONSTRAINT messages_listing_id_fkey
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'family_profiles_listing_id_fkey'
        AND conrelid = 'family_profiles'::regclass
    ) THEN
      ALTER TABLE family_profiles
        ADD CONSTRAINT family_profiles_listing_id_fkey
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
    END IF;
  END
  $$;
`;

async function addIndexesAndConstraints() {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Database indexes and constraints added successfully.');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Index and constraint migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}

addIndexesAndConstraints();




