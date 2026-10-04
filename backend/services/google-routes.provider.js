const GOOGLE_MODE = Object.freeze({ walk: 'WALK', transit: 'TRANSIT', drive: 'DRIVE' });
const FIELD_MASK = 'routes.duration,routes.distanceMeters,routes.legs.steps.travelMode,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration';

function secondsFromDuration(value) {
  if (typeof value !== 'string') return 0;
  const match = value.match(/^([0-9]+(?:\.[0-9]+)?)s$/);
  return match ? Math.round(Number(match[1])) : 0;
}

function summarizeRoute(route, mode) {
  const steps = (route.legs || []).flatMap((leg) => leg.steps || []);
  const walkingSteps = steps.filter((step) => step.travelMode === 'WALK');
  const walkingDistanceMeters = walkingSteps.reduce((total, step) => total + Number(step.distanceMeters || 0), 0);
  const walkingDurationSeconds = walkingSteps.reduce((total, step) => total + secondsFromDuration(step.staticDuration), 0);
  return {
    mode,
    status: 'available',
    distanceMeters: Number(route.distanceMeters || 0),
    durationSeconds: secondsFromDuration(route.duration),
    lastMile: mode === 'transit' && walkingSteps.length > 0 ? { walkingDistanceMeters, walkingDurationSeconds } : null,
    realTime: false,
    basis: mode === 'transit' ? 'schedule_estimate' : 'provider_estimate',
  };
}

function createGoogleRoutesProvider({ apiKey = process.env.GOOGLE_ROUTES_API_KEY, fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  return {
    name: 'google_routes',
    async estimate({ origin, destination, mode, departureTime }) {
      if (!apiKey) { const error = new Error('Routing provider is not configured.'); error.code = 'ROUTING_NOT_CONFIGURED'; throw error; }
      const body = {
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        travelMode: GOOGLE_MODE[mode],
        computeAlternativeRoutes: false,
        languageCode: 'en',
        units: 'METRIC',
        ...(mode === 'transit' ? { departureTime } : {}),
        ...(mode === 'drive' ? { routingPreference: 'TRAFFIC_UNAWARE' } : {}),
      };
      let response;
      try {
        response = await fetchImpl('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST', signal: AbortSignal.timeout(timeoutMs),
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELD_MASK },
          body: JSON.stringify(body),
        });
      } catch (cause) { const error = new Error('Routing provider could not be reached.'); error.code = 'ROUTING_PROVIDER_FAILURE'; error.cause = cause; throw error; }
      if (!response.ok) { const error = new Error(`Routing provider returned ${response.status}.`); error.code = 'ROUTING_PROVIDER_FAILURE'; throw error; }
      const payload = await response.json();
      if (!payload.routes?.length) return { mode, status: 'unavailable', reason: 'No route is available for this mode.' };
      return summarizeRoute(payload.routes[0], mode);
    },
  };
}

module.exports = { createGoogleRoutesProvider, secondsFromDuration, summarizeRoute };
