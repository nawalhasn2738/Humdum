require('dotenv').config();

const pool = require('./db');

const migration = `
  CREATE TABLE IF NOT EXISTS document_uploads (
    id BIGSERIAL PRIMARY KEY,
    uploader_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    document_type VARCHAR(50) NOT NULL CHECK (
      document_type IN (
        'identity_verification',
        'listing_verification',
        'compliance_certificate'
      )
    ),
    subject_user_id BIGINT REFERENCES users(id) ON DELETE RESTRICT,
    listing_id BIGINT REFERENCES listings(id) ON DELETE RESTRICT,
    audit_id BIGINT REFERENCES compliance_audits(id) ON DELETE RESTRICT,
    storage_bucket VARCHAR(100) NOT NULL,
    object_path TEXT NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    sha256_hash VARCHAR(64) NOT NULL CHECK (sha256_hash ~ '^[0-9a-f]{64}$'),
    upload_status VARCHAR(30) NOT NULL DEFAULT 'available'
      CHECK (upload_status IN ('available', 'quarantined', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
      (document_type = 'identity_verification' AND subject_user_id IS NOT NULL)
      OR (document_type = 'listing_verification' AND listing_id IS NOT NULL)
      OR (document_type = 'compliance_certificate' AND listing_id IS NOT NULL)
    )
  );

  CREATE INDEX IF NOT EXISTS document_uploads_user_idx
    ON document_uploads (subject_user_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS document_uploads_listing_idx
    ON document_uploads (listing_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS document_uploads_audit_idx
    ON document_uploads (audit_id, created_at DESC);
`;

async function migrateUploads() {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Document upload migration completed successfully.');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Document upload migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}

migrateUploads();
