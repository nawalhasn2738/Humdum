const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_CANDIDATE_PATTERN = /\+?\d[\d\s().-]{8,}\d/g;

function redactSensitiveContent(content) {
  const withoutEmails = content.replace(EMAIL_PATTERN, '[email hidden]');

  return withoutEmails.replace(PHONE_CANDIDATE_PATTERN, (candidate) => {
    const digitCount = candidate.replace(/\D/g, '').length;
    return digitCount >= 10 && digitCount <= 15 ? '[phone hidden]' : candidate;
  });
}

function maskEmail(email) {
  if (!email || !email.includes('@')) {
    return null;
  }

  const [localPart, domain] = email.split('@');
  return `${localPart.slice(0, 1)}***@${domain}`;
}

function maskPhone(phone, storedMask) {
  if (storedMask) {
    return storedMask;
  }

  if (!phone || phone.length < 7) {
    return null;
  }

  return `${phone.slice(0, 3)}${'*'.repeat(phone.length - 6)}${phone.slice(-3)}`;
}

function applyMessagePrivacy({ content, viewerRole, isVerifiedContact }) {
  if (viewerRole === 'admin' || isVerifiedContact) {
    return { content, isMasked: false };
  }

  return {
    content: redactSensitiveContent(content),
    isMasked: true,
  };
}

function serializeContact(profile, canRevealContactDetails) {
  return {
    id: String(profile.id),
    name: profile.name,
    role: profile.role,
    email: canRevealContactDetails ? profile.email : maskEmail(profile.email),
    phone: canRevealContactDetails
      ? profile.phone
      : maskPhone(profile.phone, profile.masked_phone),
  };
}

module.exports = {
  applyMessagePrivacy,
  redactSensitiveContent,
  serializeContact,
};
