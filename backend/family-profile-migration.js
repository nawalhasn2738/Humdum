require('dotenv').config();

const pool = require('./db');

const migration = `
  ALTER TABLE family_profiles
    ALTER COLUMN listing_id DROP NOT NULL;

  ALTER TABLE family_profiles
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100),
    ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(320),
    ADD COLUMN IF NOT EXISTS secondary_guardian_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS check_in_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

  CREATE UNIQUE INDEX IF NOT EXISTS family_profiles_user_unique_idx
    ON family_profiles (user_id)
    WHERE user_id IS NOT NULL;

  CREATE INDEX IF NOT EXISTS family_profiles_listing_user_idx
    ON family_profiles (listing_id, user_id);

  CREATE TABLE IF NOT EXISTS family_check_ins (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
      CHECK (status IN ('confirmed', 'missed', 'pending')),
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    guardian_notified_at TIMESTAMPTZ
  );

  CREATE INDEX IF NOT EXISTS family_check_ins_user_time_idx
    ON family_check_ins (user_id, checked_in_at DESC);

  CREATE TABLE IF NOT EXISTS sos_alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'triggered'
      CHECK (status IN ('triggered', 'acknowledged', 'resolved')),
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
  );

  CREATE INDEX IF NOT EXISTS sos_alerts_user_time_idx
    ON sos_alerts (user_id, triggered_at DESC);
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
