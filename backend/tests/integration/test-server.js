const path = require('node:path');

const profiles = {
  'tenant-a': { id: 101, name: 'Tenant A', email: 'tenant-a@example.test', role: 'tenant', phone: '+923001111111', masked_phone: '+92******1111' },
  'tenant-b': { id: 102, name: 'Tenant B', email: 'tenant-b@example.test', role: 'tenant', phone: '+923002222222', masked_phone: '+92******2222' },
  'landlord-a': { id: 201, name: 'Landlord A', email: 'landlord-a@example.test', role: 'landlord', phone: '+923003333333', masked_phone: '+92******3333' },
  'landlord-b': { id: 202, name: 'Landlord B', email: 'landlord-b@example.test', role: 'landlord', phone: '+923004444444', masked_phone: '+92******4444' },
  admin: { id: 301, name: 'Admin', email: 'admin@example.test', role: 'admin', phone: '+923005555555', masked_phone: '+92******5555' },
  inspector: { id: 302, name: 'Inspector', email: 'inspector@example.test', role: 'safety_inspector', phone: '+923006666666', masked_phone: '+92******6666' },
};
let queryHandler = async () => ({ rows: [], rowCount: 0 });
const calls = [];
async function query(sql, values = []) {
  calls.push({ sql: String(sql), values });
  if (/FROM users\s+WHERE supabase_user_id/i.test(sql)) {
    const profile = profiles[values[0]];
    return { rows: profile ? [profile] : [], rowCount: profile ? 1 : 0 };
  }
  return queryHandler(String(sql), values);
}
const client = { query, release() {} };
const pool = { query, connect: async () => client, end: async () => {} };

function installFakes() {
  process.env.DATABASE_URL = 'postgresql://integration.invalid/humdum_test';
  process.env.SUPABASE_URL = 'https://integration.invalid';
  process.env.SUPABASE_ANON_KEY = 'integration-test-key';
  const dbPath = require.resolve('../../db');
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: pool, children: [], paths: [] };
  const supabasePath = require.resolve('../../services/supabase');
  require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: {
    validateSupabaseEnvironment() {},
    getSupabaseClient() { return { auth: { async getClaims(token) { return profiles[token] ? { data: { claims: { sub: token, email: profiles[token].email } }, error: null } : { data: null, error: new Error('invalid') }; } } }; },
  }, children: [], paths: [] };
}

installFakes();
const { createApp } = require('../../app');

async function startTestServer() {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const address = server.address();
  return {
    async request(pathname, { token, method = 'GET', body, headers = {} } = {}) {
      const response = await fetch(`http://127.0.0.1:${address.port}${pathname}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const text = await response.text();
      let payload = text;
      try { payload = text ? JSON.parse(text) : null; } catch {}
      return { status: response.status, headers: response.headers, body: payload };
    },
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}
function resetDatabase(handler = async () => ({ rows: [], rowCount: 0 })) { queryHandler = handler; calls.length = 0; }
function result(rows = []) { return { rows, rowCount: rows.length }; }

module.exports = { calls, profiles, resetDatabase, result, startTestServer };
