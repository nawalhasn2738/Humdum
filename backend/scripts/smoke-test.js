require('dotenv').config();

const readline = require('readline/promises');
const { stdin, stdout } = require('process');

const baseUrl = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const latitude = Number(process.env.SMOKE_LATITUDE || 24.8607);
const longitude = Number(process.env.SMOKE_LONGITUDE || 67.0011);
const radiusKm = Number(process.env.SMOKE_RADIUS_KM || 2);

async function request(path, { method = 'GET', body, token, expected = [200] } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let payload;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!expected.includes(response.status)) {
    throw new Error(
      `${method} ${path} returned ${response.status}: ${JSON.stringify(payload)}`
    );
  }

  return { status: response.status, payload };
}

async function obtainAccessToken() {
  if (process.env.SMOKE_ACCESS_TOKEN) {
    console.log('Using SMOKE_ACCESS_TOKEN; registration and OTP delivery are skipped.');
    return process.env.SMOKE_ACCESS_TOKEN;
  }

  const name = process.env.SMOKE_NAME || 'Humdum Smoke Landlord';
  const email = process.env.SMOKE_EMAIL;
  const phone = process.env.SMOKE_PHONE;

  if (!email || !phone) {
    throw new Error(
      'Set SMOKE_EMAIL and SMOKE_PHONE, or provide SMOKE_ACCESS_TOKEN.'
    );
  }

  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: { name, email, phone, role: 'landlord' },
    expected: [201, 409],
  });
  console.log(
    registration.status === 201
      ? 'PASS registration created the landlord profile.'
      : 'PASS existing landlord profile accepted for repeat smoke test.'
  );

  await request('/api/auth/phone/request-otp', {
    method: 'POST',
    body: { phone },
    expected: [202],
  });
  console.log('PASS Supabase accepted the SMS OTP request.');

  let otp = process.env.SMOKE_OTP;
  if (!otp) {
    const prompt = readline.createInterface({ input: stdin, output: stdout });
    otp = (await prompt.question('Enter the Supabase SMS OTP: ')).trim();
    prompt.close();
  }

  const verification = await request('/api/auth/phone/verify-otp', {
    method: 'POST',
    body: { phone, token: otp },
    expected: [200],
  });

  if (!verification.payload?.accessToken) {
    throw new Error('OTP verification did not return an access token.');
  }

  console.log('PASS OTP verification returned a JWT access token.');
  return verification.payload.accessToken;
}

async function run() {
  console.log(`Running Humdum smoke test against ${baseUrl}`);

  const database = await request('/test-db');
  if (!database.payload?.currentTime) {
    throw new Error('Database health response did not include currentTime.');
  }
  console.log('PASS PostgreSQL connection and SELECT NOW().');

  const accessToken = await obtainAccessToken();
  const identity = await request('/api/protected', { token: accessToken });

  if (
    identity.payload?.user?.role !== 'landlord' ||
    !identity.payload?.user?.profileId
  ) {
    throw new Error(
      `Expected a linked landlord profile, received: ${JSON.stringify(identity.payload?.user)}`
    );
  }
  console.log('PASS JWT authentication resolved the landlord RBAC profile.');

  const uniqueSuffix = Date.now();
  const creation = await request('/api/listings', {
    method: 'POST',
    token: accessToken,
    expected: [201],
    body: {
      title: `Smoke Test Listing ${uniqueSuffix}`,
      description: 'Temporary listing created by the local smoke test.',
      rent: 35000,
      deposit: 35000,
      curfewRules: 'Entry before 11:00 PM',
      latitude,
      longitude,
    },
  });
  const listing = creation.payload?.listing;

  if (
    !listing?.id ||
    listing.location?.latitude !== latitude ||
    listing.location?.longitude !== longitude
  ) {
    throw new Error(
      `Listing response did not preserve PostGIS coordinates: ${JSON.stringify(listing)}`
    );
  }
  console.log(`PASS landlord created listing ${listing.id} with SRID 4326 coordinates.`);

  const query = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    radius: String(radiusKm),
  });
  const search = await request(`/api/listings?${query}`);
  const match = search.payload?.listings?.find(
    (candidate) => String(candidate.id) === String(listing.id)
  );

  if (!match) {
    throw new Error(
      `Radius search did not return listing ${listing.id}: ${JSON.stringify(search.payload)}`
    );
  }

  if (!Number.isFinite(match.distanceKm) || match.distanceKm > radiusKm) {
    throw new Error(`Radius result returned an invalid distance: ${match.distanceKm}`);
  }

  console.log(
    `PASS ST_DWithin returned listing ${listing.id} at ${match.distanceKm} km.`
  );
  console.log('Smoke test completed successfully.');
}

run().catch((error) => {
  console.error(`SMOKE TEST FAILED: ${error.message}`);
  process.exitCode = 1;
});
