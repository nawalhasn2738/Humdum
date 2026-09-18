require('dotenv').config();

const pool = require('./db');

const migration = `
  CREATE TABLE IF NOT EXISTS compliance_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action_type VARCHAR(100) NOT NULL,
    target_listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
    previous_state JSONB,
    new_state JSONB NOT NULL,
    previous_hash VARCHAR(64),
    record_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (record_hash ~ '^[0-9a-f]{64}$'),
    CHECK (previous_hash IS NULL OR previous_hash ~ '^[0-9a-f]{64}$')
  );

  CREATE INDEX IF NOT EXISTS compliance_audit_logs_listing_history_idx
    ON compliance_audit_logs (target_listing_id, id);

  CREATE OR REPLACE FUNCTION prevent_compliance_audit_log_mutation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RAISE EXCEPTION 'compliance audit logs are immutable';
  END;
  $$;

  DROP TRIGGER IF EXISTS compliance_audit_logs_immutable
    ON compliance_audit_logs;

  CREATE TRIGGER compliance_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON compliance_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_compliance_audit_log_mutation();
`;

async function migrateAuditTrail() {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Audit trail migration completed successfully.');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Audit trail migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}

migrateAuditTrail();
