require('dotenv').config();
const pool = require('./db');

const sql = `
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS capacity INTEGER;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS accommodation_type VARCHAR(30);
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_email VARCHAR(320);
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(30);
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS reported_safety_features TEXT[] NOT NULL DEFAULT '{}';
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(30) NOT NULL DEFAULT 'active';
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_capacity_check') THEN
      ALTER TABLE listings ADD CONSTRAINT listings_capacity_check CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_accommodation_type_check') THEN
      ALTER TABLE listings ADD CONSTRAINT listings_accommodation_type_check
        CHECK (accommodation_type IS NULL OR accommodation_type IN ('hostel', 'room', 'apartment', 'house'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_moderation_status_check') THEN
      ALTER TABLE listings ADD CONSTRAINT listings_moderation_status_check
        CHECK (moderation_status IN ('active', 'under_review', 'suspended'));
    END IF;
  END
  $$;
`;

async function migrate() {
  try {
    await pool.query(sql);
    console.log('Listing management migration completed.');
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Listing management migration failed:', error);
  process.exitCode = 1;
});
