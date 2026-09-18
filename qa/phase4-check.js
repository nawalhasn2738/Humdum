const API = 'http://localhost:5000/api';

async function request(path, { method = 'GET', token, body, form } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const text = await response.text();
  let payload = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { status: response.status, payload };
}

async function login(email) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: { email },
  });
  if (!result.payload?.accessToken) {
    throw new Error(`Login failed for ${email}: ${result.status} ${JSON.stringify(result.payload)}`);
  }
  return result.payload.accessToken;
}

async function main() {
  const tenantToken = await login('tenant@humdum.com');
  console.log('4.1 tenant login: OK');

  const listingAsTenant = await request('/listings', {
    method: 'POST',
    token: tenantToken,
    body: {
      title: 'Should be forbidden',
      rent: 10000,
      latitude: 33.6844,
      longitude: 73.0479,
    },
  });
  console.log(
    `4.1 tenant creates listing: ${listingAsTenant.status} ${listingAsTenant.payload?.error || ''}`
  );

  const bookingBody = {
    listingId: '1',
    startDate: '2026-10-01',
    endDate: '2026-12-01',
  };
  const [first, second] = await Promise.all([
    request('/tenancies', { method: 'POST', token: tenantToken, body: bookingBody }),
    request('/tenancies', { method: 'POST', token: tenantToken, body: bookingBody }),
  ]);
  console.log(`4.2 booking A: ${first.status} ${first.payload?.error || first.payload?.tenancy?.id || ''}`);
  console.log(`4.2 booking B: ${second.status} ${second.payload?.error || second.payload?.tenancy?.id || ''}`);

  const exe = new File([Buffer.from('MZ exe')], 'malware.exe', {
    type: 'application/x-msdownload',
  });
  const exeForm = new FormData();
  exeForm.append('file', exe);
  exeForm.append('documentType', 'identity_verification');
  const blocked = await request('/uploads/document', {
    method: 'POST',
    token: tenantToken,
    form: exeForm,
  });
  console.log(`4.3 invalid exe: ${blocked.status} ${blocked.payload?.error || ''}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
