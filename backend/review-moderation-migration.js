require('dotenv').config();
const pool = require('./db');

const migration = `
  ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'approved',
    ADD COLUMN IF NOT EXISTS moderation_reason VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS moderated_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

  ALTER TABLE reviews ALTER COLUMN moderation_status SET DEFAULT 'pending';

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'reviews_moderation_status_check'
        AND conrelid = 'reviews'::regclass
    ) THEN
      ALTER TABLE reviews ADD CONSTRAINT reviews_moderation_status_check
        CHECK (moderation_status IN ('pending', 'flagged', 'approved', 'hidden', 'rejected'));
    END IF;
  END $$;

  CREATE INDEX IF NOT EXISTS reviews_moderation_queue_idx
    ON reviews (moderation_status, created_at DESC, id DESC);

  CREATE TABLE IF NOT EXISTS review_moderation_logs (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES reviews(id) ON DELETE RESTRICT,
    admin_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    previous_status VARCHAR(20) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approve', 'hide', 'reject')),
    new_status VARCHAR(20) NOT NULL CHECK (new_status IN ('approved', 'hidden', 'rejected')),
    reason VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS review_moderation_logs_review_idx
    ON review_moderation_logs (review_id, id);

  CREATE OR REPLACE FUNCTION prevent_review_moderation_log_mutation()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
  BEGIN
    RAISE EXCEPTION 'review moderation logs are immutable';
  END;
  $$;

  DROP TRIGGER IF EXISTS review_moderation_logs_immutable ON review_moderation_logs;
  CREATE TRIGGER review_moderation_logs_immutable
    BEFORE UPDATE OR DELETE ON review_moderation_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_review_moderation_log_mutation();
`;

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Review moderation migration completed successfully.');
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Review moderation migration failed:', error.message);
    process.exitCode = 1;
  } finally { client?.release(); await pool.end(); }
}
migrate();
