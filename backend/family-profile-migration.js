require('dotenv').config();

const pool = require('./db');

const migration = `
  ALTER TABLE family_profiles
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100),
    ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS secondary_guardian_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS check_in_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

  CREATE UNIQUE INDEX IF NOT EXISTS family_profiles_user_unique_idx
    ON family_profiles (user_id)
    WHERE user_id IS NOT NULL;

  CREATE INDEX IF NOT EXISTS family_profiles_listing_user_idx
    ON family_profiles (listing_id, user_id);
`;

async function migrateFamilyProfiles() {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Family profile migration completed successfully.');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Family profile migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}

migrateFamilyProfiles();
