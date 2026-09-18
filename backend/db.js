const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to connect to PostgreSQL.');
}

const connectionString = process.env.DATABASE_URL;
const parsed = new URL(connectionString);
const poolerHost = process.env.DATABASE_POOLER_HOST;
const poolerIpv4 = process.env.DATABASE_POOLER_IPV4;
const sslServerName = process.env.DATABASE_SSL_SERVERNAME || parsed.hostname;

const pool = new Pool({
  host: poolerIpv4 || poolerHost || parsed.hostname,
  port: Number(parsed.port || 5432),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, '') || 'postgres',
  ssl: {
    rejectUnauthorized: false,
    servername: sslServerName,
  },
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

module.exports = pool;
