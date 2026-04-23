/**
 * Haversine distance between two coordinates (returns km as string).
 */
export function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

/**
 * Format distance number to human-readable string.
 */
export function formatDistance(km) {
  const n = parseFloat(km);
  if (n < 1) return `${Math.round(n * 1000)} m de ti`;
  if (n < 10) return `${n.toFixed(1)} km de ti`;
  return `${Math.round(n)} km de ti`;
}
