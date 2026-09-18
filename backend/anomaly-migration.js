require('dotenv').config();

const pool = require('./db');

const migration = `
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(30) NOT NULL DEFAULT 'active';

  ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS anomaly_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(30) NOT NULL DEFAULT 'active';

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'users_risk_score_range'
    ) THEN
      ALTER TABLE users
        ADD CONSTRAINT users_risk_score_range CHECK (risk_score BETWEEN 0 AND 100);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'users_moderation_status_check'
    ) THEN
      ALTER TABLE users
        ADD CONSTRAINT users_moderation_status_check
        CHECK (moderation_status IN ('active', 'under_review', 'suspended'));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'listings_anomaly_score_range'
    ) THEN
      ALTER TABLE listings
        ADD CONSTRAINT listings_anomaly_score_range CHECK (anomaly_score BETWEEN 0 AND 100);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'listings_moderation_status_check'
    ) THEN
      ALTER TABLE listings
        ADD CONSTRAINT listings_moderation_status_check
        CHECK (moderation_status IN ('active', 'under_review', 'suspended'));
    END IF;
  END
  $$;

  CREATE TABLE IF NOT EXISTS anomaly_reports (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('listing', 'user')),
    listing_id BIGINT REFERENCES listings(id) ON DELETE RESTRICT,
    user_id BIGINT REFERENCES users(id) ON DELETE RESTRICT,
    anomaly_type VARCHAR(100) NOT NULL,
    severity_score NUMERIC(5, 2) NOT NULL CHECK (severity_score BETWEEN 0 AND 100),
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
      CHECK (status IN ('open', 'reviewed', 'dismissed')),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CHECK (
      (entity_type = 'listing' AND listing_id IS NOT NULL AND user_id IS NULL)
      OR (entity_type = 'user' AND user_id IS NOT NULL AND listing_id IS NULL)
    )
  );

  CREATE UNIQUE INDEX IF NOT EXISTS anomaly_reports_open_listing_idx
    ON anomaly_reports (listing_id, anomaly_type)
    WHERE entity_type = 'listing' AND status = 'open';

  CREATE UNIQUE INDEX IF NOT EXISTS anomaly_reports_open_user_idx
    ON anomaly_reports (user_id, anomaly_type)
    WHERE entity_type = 'user' AND status = 'open';

  CREATE INDEX IF NOT EXISTS anomaly_reports_moderation_queue_idx
    ON anomaly_reports (status, detected_at DESC);
`;

async function migrateAnomalies() {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Anomaly detection migration completed successfully.');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Anomaly detection migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}

migrateAnomalies();
