require('dotenv').config();
const pool = require('./db');

const sql = `
  CREATE TABLE IF NOT EXISTS inquiries (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE UNIQUE INDEX IF NOT EXISTS inquiries_unique_active_idx
    ON inquiries (tenant_id, listing_id)
    WHERE status IN ('pending', 'accepted');

  CREATE INDEX IF NOT EXISTS inquiries_listing_status_idx
    ON inquiries (listing_id, status, created_at DESC);
`;

async function migrate() {
  try {
    await pool.query(sql);
    console.log('Inquiry migration completed.');
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Inquiry migration failed:', error);
  process.exitCode = 1;
});
