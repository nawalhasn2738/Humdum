function buildAuthenticatedIdentity(claims, profile) {
  return {
    id: claims.sub,
    profileId: profile ? String(profile.id) : null,
    name: profile?.name || null,
    role: profile?.role || null,
    supabaseRole: claims.role || null,
    email: profile?.email || claims.email || null,
    phone: profile?.phone || claims.phone || null,
    maskedPhone: profile?.masked_phone || null,
  };
}

module.exports = { buildAuthenticatedIdentity };
