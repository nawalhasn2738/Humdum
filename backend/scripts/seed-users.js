require('dotenv').config();

const bcrypt = require('bcrypt');
const pool = require('../db');

const BCRYPT_ROUNDS = 12;
const TEST_PASSWORD = 'Password123!';
const TEST_USERS = [
  {
    name: 'Ayesha Khan',
    email: 'tenant@humdum.com',
    role: 'tenant',
  },
  {
    name: 'Host Partner',
    email: 'landlord@humdum.com',
    role: 'landlord',
  },
  {
    name: 'System Admin',
    email: 'admin@humdum.com',
    role: 'admin',
  },
];

async function seedUsers() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to seed users.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('humdum:seed-users'))"
    );

    const tableResult = await client.query(
      "SELECT to_regclass('public.users') AS users_table"
    );
    if (!tableResult.rows[0].users_table) {
      throw new Error(
        'The users table does not exist. Run the database migrations first.'
      );
    }

    await client.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT'
    );

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);

    for (const user of TEST_USERS) {
      const existingUser = await client.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [user.email]
      );

      if (existingUser.rowCount > 0) {
        console.log(`Skipped existing ${user.role}: ${user.email}`);
        continue;
      }

      await client.query(
        `INSERT INTO users (name, email, role, password_hash)
         VALUES ($1, LOWER($2), $3, $4)`,
        [user.name, user.email, user.role, passwordHash]
      );
      console.log(`Created ${user.role}: ${user.email}`);
    }

    await client.query('COMMIT');
    console.log('Default test users seeded successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seedUsers()
  .catch((error) => {
    console.error('Failed to seed test users:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
