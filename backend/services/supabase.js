const { createClient } = require('@supabase/supabase-js');

let supabase;

const REQUIRED_SUPABASE_ENVIRONMENT = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

function isPlaceholder(value) {
  return (
    !value ||
    /^\s*$/.test(value) ||
    /\[(?:YOUR|REPLACE)|<(?:YOUR|REPLACE)|YOUR_|CHANGEME/i.test(value)
  );
}

function decodeJwtRole(value) {
  if (!value?.startsWith('eyJ')) {
    return null;
  }

  try {
    const payload = value.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role || null;
  } catch {
    return null;
  }
}

function validateSupabaseEnvironment() {
  const missing = REQUIRED_SUPABASE_ENVIRONMENT.filter((name) =>
    isPlaceholder(process.env[name])
  );

  if (missing.length) {
    throw new Error(
      `Missing or placeholder Supabase environment variables: ${missing.join(', ')}.`
    );
  }

  let url;
  try {
    url = new URL(process.env.SUPABASE_URL);
  } catch {
    throw new Error('SUPABASE_URL must be a valid absolute URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('SUPABASE_URL must use HTTP or HTTPS.');
  }

  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonRole = decodeJwtRole(anonKey);
  const serviceRole = decodeJwtRole(serviceRoleKey);

  if (!anonKey.startsWith('sb_publishable_') && anonRole !== 'anon') {
    throw new Error(
      'SUPABASE_ANON_KEY must be a Supabase publishable key or legacy anon JWT.'
    );
  }

  if (!serviceRoleKey.startsWith('sb_secret_') && serviceRole !== 'service_role') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY must be a Supabase secret key or legacy service_role JWT.'
    );
  }

  if (anonKey === serviceRoleKey) {
    throw new Error('Supabase public and service-role keys must be different.');
  }
}

function getSupabaseClient() {
  validateSupabaseEnvironment();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return supabase;
}

module.exports = { getSupabaseClient, validateSupabaseEnvironment };
