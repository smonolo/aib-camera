import {
  destinationPoint,
  haversineMeters,
  parseAimDistanceMeters,
} from '@/lib/geo-math'

describe('haversineMeters', () => {
  it('is ~0 for the same point', () => {
    expect(haversineMeters(45.46, 9.19, 45.46, 9.19)).toBeCloseTo(0, 5)
  })

  it('measures a known short segment near Milan', () => {
    const d = haversineMeters(45.4642, 9.19, 45.4651, 9.19)
    expect(d).toBeGreaterThan(90)
    expect(d).toBeLessThan(110)
  })
})

describe('destinationPoint', () => {
  const origin = { lat: 45.4642, lon: 9.19 }

  it('leaves the point unchanged for non-positive distance', () => {
    expect(destinationPoint(origin.lat, origin.lon, 0, 0)).toEqual(origin)
    expect(destinationPoint(origin.lat, origin.lon, 90, -10)).toEqual(origin)
  })

  it('moves ~100 m due north', () => {
    const dest = destinationPoint(origin.lat, origin.lon, 0, 100)
    const d = haversineMeters(origin.lat, origin.lon, dest.lat, dest.lon)
    expect(d).toBeCloseTo(100, 0)
    expect(dest.lat).toBeGreaterThan(origin.lat)
    expect(Math.abs(dest.lon - origin.lon)).toBeLessThan(1e-5)
  })

  it('moves ~200 m due east', () => {
    const dest = destinationPoint(origin.lat, origin.lon, 90, 200)
    const d = haversineMeters(origin.lat, origin.lon, dest.lat, dest.lon)
    expect(d).toBeCloseTo(200, 0)
    expect(dest.lon).toBeGreaterThan(origin.lon)
    expect(Math.abs(dest.lat - origin.lat)).toBeLessThan(1e-4)
  })

  it('moves ~500 m southwest', () => {
    const dest = destinationPoint(origin.lat, origin.lon, 225, 500)
    const d = haversineMeters(origin.lat, origin.lon, dest.lat, dest.lon)
    expect(d).toBeCloseTo(500, 0)
    expect(dest.lat).toBeLessThan(origin.lat)
    expect(dest.lon).toBeLessThan(origin.lon)
  })

  it('normalizes headings outside 0–360', () => {
    const a = destinationPoint(origin.lat, origin.lon, 90, 150)
    const b = destinationPoint(origin.lat, origin.lon, 450, 150)
    expect(a.lat).toBeCloseTo(b.lat, 8)
    expect(a.lon).toBeCloseTo(b.lon, 8)
  })
})

describe('parseAimDistanceMeters', () => {
  it('parses valid distances', () => {
    expect(parseAimDistanceMeters('200')).toBe(200)
    expect(parseAimDistanceMeters('200 m')).toBe(200)
    expect(parseAimDistanceMeters(99.6)).toBe(100)
  })

  it('rejects invalid distances', () => {
    expect(parseAimDistanceMeters('')).toBeNull()
    expect(parseAimDistanceMeters(0)).toBeNull()
    expect(parseAimDistanceMeters(-1)).toBeNull()
    expect(parseAimDistanceMeters(50_001)).toBeNull()
  })
})
