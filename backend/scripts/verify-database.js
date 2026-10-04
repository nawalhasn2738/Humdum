require('dotenv').config();

const pool = require('../db');

const expectedTables = [
  'users', 'listings', 'compliance_audits', 'tenancies', 'inquiries',
  'reviews', 'messages', 'family_profiles', 'compliance_audit_logs',
  'anomaly_reports', 'family_check_ins', 'sos_alerts', 'document_uploads',
  'review_moderation_logs',
];

const expectedColumns = {
  users: ['supabase_user_id', 'moderation_status', 'risk_score'],
  listings: ['geo_point', 'capacity', 'accommodation_type', 'contact_email', 'contact_phone', 'reported_safety_features', 'moderation_status', 'updated_at', 'anomaly_score'],
  inquiries: ['tenant_id', 'listing_id', 'status', 'updated_at'],
  reviews: ['tenancy_id', 'rating', 'comment', 'moderation_status', 'moderation_reason', 'moderated_by', 'moderated_at'],
  messages: ['sender_id', 'receiver_id', 'listing_id', 'content', 'is_masked'],
  family_profiles: ['user_id', 'listing_id', 'check_in_preferences'],
  document_uploads: ['uploader_id', 'document_type', 'object_path', 'upload_status', 'review_status', 'rejection_reason', 'reviewed_by', 'reviewed_at'],
};

async function verifySchema(client) {
  const tableResult = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [expectedTables]
  );
  const presentTables = new Set(tableResult.rows.map((row) => row.table_name));
  const missingTables = expectedTables.filter((table) => !presentTables.has(table));

  const requestedColumns = Object.entries(expectedColumns).flatMap(([table, columns]) =>
    columns.map((column) => `${table}.${column}`)
  );
  const columnResult = await client.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [Object.keys(expectedColumns)]
  );
  const presentColumns = new Set(columnResult.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const missingColumns = requestedColumns.filter((column) => {
    const table = column.split('.')[0];
    return presentTables.has(table) && !presentColumns.has(column);
  });

  return { missingTables, missingColumns };
}

async function verifyWrite(client) {
  await client.query('BEGIN');
  try {
    await client.query(`CREATE TEMP TABLE humdum_connection_check (
      id BIGSERIAL PRIMARY KEY,
      marker TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    ) ON COMMIT DROP`);
    const marker = `humdum-db-check-${Date.now()}`;
    const insert = await client.query(
      'INSERT INTO humdum_connection_check (marker) VALUES ($1) RETURNING id, marker',
      [marker]
    );
    const readBack = await client.query(
      'SELECT marker FROM humdum_connection_check WHERE id = $1',
      [insert.rows[0].id]
    );
    if (readBack.rows[0]?.marker !== marker) {
      throw new Error('Inserted marker could not be read back correctly.');
    }
    await client.query('ROLLBACK');
    return insert.rows[0].id;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  }
}

async function run() {
  let client;
  try {
    client = await pool.connect();
    const identity = await client.query(
      'SELECT NOW() AS server_time, current_database() AS database, current_user AS database_user, version() AS version'
    );
    const schema = await verifySchema(client);
    const writeId = await verifyWrite(client);
    const info = identity.rows[0];

    console.log(`PASS Connected to database "${info.database}" as "${info.database_user}".`);
    console.log(`PASS PostgreSQL responded at ${info.server_time.toISOString()}.`);
    console.log(`PASS Transactional write/read succeeded (temporary row ${writeId}) and was rolled back.`);

    if (schema.missingTables.length || schema.missingColumns.length) {
      console.error('SCHEMA CHECK FAILED: expected migration objects are missing.');
      if (schema.missingTables.length) console.error(`Missing tables: ${schema.missingTables.join(', ')}`);
      if (schema.missingColumns.length) console.error(`Missing columns: ${schema.missingColumns.join(', ')}`);
      process.exitCode = 2;
      return;
    }
    console.log('PASS Expected Humdum tables and migration columns are present.');
  } catch (error) {
    console.error(`DATABASE VERIFY FAILED: ${error.message}`);
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool.end();
  }
}

run();
