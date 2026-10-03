require('dotenv').config();

const pool = require('./db');

const migration = `
  CREATE EXTENSION IF NOT EXISTS postgis;

  CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    supabase_user_id UUID UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(320) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('tenant', 'landlord', 'admin')),
    phone VARCHAR(50),
    masked_phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

  CREATE UNIQUE INDEX IF NOT EXISTS users_supabase_user_id_unique_idx
    ON users (supabase_user_id)
    WHERE supabase_user_id IS NOT NULL;

  CREATE TABLE IF NOT EXISTS listings (
    id BIGSERIAL PRIMARY KEY,
    landlord_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    rent NUMERIC(12, 2) NOT NULL CHECK (rent >= 0),
    deposit NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deposit >= 0),
    curfew_rules TEXT,
    capacity INTEGER CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 100),
    accommodation_type VARCHAR(30) CHECK (accommodation_type IS NULL OR accommodation_type IN ('hostel', 'room', 'apartment', 'house')),
    contact_email VARCHAR(320),
    contact_phone VARCHAR(30),
    reported_safety_features TEXT[] NOT NULL DEFAULT '{}',
    moderation_status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (moderation_status IN ('active', 'under_review', 'suspended')),
    geo_point geometry(Point, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS compliance_audits (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    fire_safety_score NUMERIC(5, 2) CHECK (fire_safety_score BETWEEN 0 AND 100),
    cctv_verified BOOLEAN NOT NULL DEFAULT FALSE,
    warden_verified BOOLEAN NOT NULL DEFAULT FALSE,
    audit_score NUMERIC(5, 2) CHECK (audit_score BETWEEN 0 AND 100),
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS tenancies (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date IS NULL OR end_date >= start_date)
  );

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
  CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    tenancy_id BIGINT NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id BIGINT REFERENCES listings(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_masked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS family_profiles (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    shareable_token VARCHAR(255) NOT NULL UNIQUE,
    generated_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

async function migrate() {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Database migration completed successfully.');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Database migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}

migrate();

