const PUBLIC_COORDINATE_GRID_DEGREES = 0.01;

function approximateCoordinate(value, grid = PUBLIC_COORDINATE_GRID_DEGREES) {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) return null;
  return Math.round(coordinate / grid) * grid;
}

function approximatePublicLocation(location) {
  if (!location || location.latitude === null || location.longitude === null) return null;
  const latitude = approximateCoordinate(location.latitude);
  const longitude = approximateCoordinate(location.longitude);
  return latitude === null || longitude === null ? null : { latitude, longitude };
}

module.exports = { PUBLIC_COORDINATE_GRID_DEGREES, approximateCoordinate, approximatePublicLocation };
