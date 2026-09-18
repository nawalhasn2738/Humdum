const crypto = require('crypto');

const LOCAL_ISSUER = 'humdum-dev';

function isDevLoginEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_LOGIN === 'true';
}

function getJwtSecret() {
  return process.env.JWT_SECRET;
}

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function signLocalAccessToken(claims, expiresInSeconds = 60 * 60 * 24 * 7) {
  const secret = getJwtSecret();

  if (!secret) {
    throw new Error('JWT_SECRET is required for local development login.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    ...claims,
    iss: LOCAL_ISSUER,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const unsigned = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}`;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');

  return `${unsigned}.${signature}`;
}

function verifyLocalAccessToken(token) {
  if (!token || !isDevLoginEnabled()) {
    return null;
  }

  const secret = getJwtSecret();
  const parts = String(token).split('.');

  if (!secret || parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const expected = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));

    if (payload.iss !== LOCAL_ISSUER || !payload.sub || payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  LOCAL_ISSUER,
  isDevLoginEnabled,
  signLocalAccessToken,
  verifyLocalAccessToken,
};
