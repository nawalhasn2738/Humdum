const SUPPORTED_COMMUTE_MODES = Object.freeze(['walk', 'transit', 'drive']);

function validateCommuteRequest(body) {
  const origin = body?.origin || {};
  const latitude = Number(origin.latitude);
  const longitude = Number(origin.longitude);
  const modes = body?.modes === undefined ? [...SUPPORTED_COMMUTE_MODES] : body.modes;
  const errors = {};
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) errors.latitude = 'Origin latitude must be between -90 and 90.';
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) errors.longitude = 'Origin longitude must be between -180 and 180.';
  if (!Array.isArray(modes) || modes.length === 0 || modes.some((mode) => !SUPPORTED_COMMUTE_MODES.includes(mode))) errors.modes = 'Modes may include walk, transit, and drive.';
  const uniqueModes = Array.isArray(modes) ? [...new Set(modes)] : [];
  return Object.keys(errors).length ? { errors } : { value: { origin: { latitude, longitude }, modes: uniqueModes } };
}

module.exports = { SUPPORTED_COMMUTE_MODES, validateCommuteRequest };
