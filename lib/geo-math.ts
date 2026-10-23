const EARTH_RADIUS_M = 6_371_000
const MAX_AIM_DISTANCE_M = 50_000

export const AIM_DISTANCE_PRESETS = [50, 100, 200, 500] as const

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

export function destinationPoint(
  lat: number,
  lon: number,
  headingDeg: number,
  distanceM: number
): { lat: number; lon: number } {
  if (!(distanceM > 0) || !Number.isFinite(distanceM)) {
    return { lat, lon }
  }

  const angular = distanceM / EARTH_RADIUS_M
  const bearing = toRad(((headingDeg % 360) + 360) % 360)
  const lat1 = toRad(lat)
  const lon1 = toRad(lon)

  const sinLat1 = Math.sin(lat1)
  const cosLat1 = Math.cos(lat1)
  const sinAngular = Math.sin(angular)
  const cosAngular = Math.cos(angular)

  const sinLat2 =
    sinLat1 * cosAngular + cosLat1 * sinAngular * Math.cos(bearing)
  const lat2 = Math.asin(Math.min(1, Math.max(-1, sinLat2)))
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * sinAngular * cosLat1,
      cosAngular - sinLat1 * Math.sin(lat2)
    )

  return {
    lat: toDeg(lat2),
    lon: ((toDeg(lon2) + 540) % 360) - 180,
  }
}

export function parseAimDistanceMeters(raw: string | number): number | null {
  const distance =
    typeof raw === 'number'
      ? Math.round(raw)
      : Number.parseInt(String(raw).replace(/\D/g, ''), 10)
  if (
    !(distance > 0) ||
    !Number.isFinite(distance) ||
    distance > MAX_AIM_DISTANCE_M
  ) {
    return null
  }
  return distance
}
