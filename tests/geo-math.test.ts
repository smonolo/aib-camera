import {
  AIM_DISTANCE_PRESETS,
  bearingDegrees,
  destinationPoint,
  haversineMeters,
  parseAimDistanceMeters,
} from '@/lib/geo-math'

describe('AIM_DISTANCE_PRESETS', () => {
  it('exposes field presets used by the Aim sheet', () => {
    expect(AIM_DISTANCE_PRESETS).toEqual([1000, 2000, 5000, 10000])
  })
})

describe('haversineMeters', () => {
  it('is ~0 for the same point', () => {
    expect(haversineMeters(45.46, 9.19, 45.46, 9.19)).toBeCloseTo(0, 5)
  })

  it('measures a known short segment near Milan', () => {
    const d = haversineMeters(45.4642, 9.19, 45.4651, 9.19)
    expect(d).toBeGreaterThan(90)
    expect(d).toBeLessThan(110)
  })

  it('handles southern hemisphere and western longitudes', () => {
    const d = haversineMeters(-33.8688, -151.2093, -33.87, -151.2093)
    expect(d).toBeGreaterThan(100)
    expect(d).toBeLessThan(150)
  })

  it('is symmetric', () => {
    const a = haversineMeters(45.46, 9.19, 45.47, 9.2)
    const b = haversineMeters(45.47, 9.2, 45.46, 9.19)
    expect(a).toBeCloseTo(b, 8)
  })
})

describe('bearingDegrees', () => {
  const origin = { lat: 45.4642, lon: 9.19 }

  it('points roughly east for a eastern destination', () => {
    const dest = destinationPoint(origin.lat, origin.lon, 90, 250)
    expect(
      bearingDegrees(origin.lat, origin.lon, dest.lat, dest.lon)
    ).toBeCloseTo(90, 0)
  })

  it('points roughly north for a northern destination', () => {
    const dest = destinationPoint(origin.lat, origin.lon, 0, 250)
    expect(
      bearingDegrees(origin.lat, origin.lon, dest.lat, dest.lon)
    ).toBeCloseTo(0, 0)
  })

  it('round-trips destination for cardinal headings', () => {
    for (const heading of [0, 90, 180, 270]) {
      const dest = destinationPoint(origin.lat, origin.lon, heading, 400)
      expect(
        bearingDegrees(origin.lat, origin.lon, dest.lat, dest.lon)
      ).toBeCloseTo(heading, 0)
      expect(
        haversineMeters(origin.lat, origin.lon, dest.lat, dest.lon)
      ).toBeCloseTo(400, 0)
    }
  })

  it('returns 0 when origin and destination coincide', () => {
    expect(bearingDegrees(10, 20, 10, 20)).toBe(0)
  })
})

describe('destinationPoint', () => {
  const origin = { lat: 45.4642, lon: 9.19 }

  it('leaves the point unchanged for non-positive distance', () => {
    expect(destinationPoint(origin.lat, origin.lon, 0, 0)).toEqual(origin)
    expect(destinationPoint(origin.lat, origin.lon, 90, -10)).toEqual(origin)
  })

  it('leaves the point unchanged for non-finite distance', () => {
    expect(destinationPoint(origin.lat, origin.lon, 90, Number.NaN)).toEqual(
      origin
    )
    expect(
      destinationPoint(origin.lat, origin.lon, 90, Number.POSITIVE_INFINITY)
    ).toEqual(origin)
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
    const c = destinationPoint(origin.lat, origin.lon, -270, 150)
    expect(a.lat).toBeCloseTo(b.lat, 8)
    expect(a.lon).toBeCloseTo(b.lon, 8)
    expect(a.lat).toBeCloseTo(c.lat, 8)
    expect(a.lon).toBeCloseTo(c.lon, 8)
  })

  it('keeps longitude in -180…180 when crossing the antimeridian', () => {
    const dest = destinationPoint(0, 179.9, 90, 50_000)
    expect(dest.lon).toBeGreaterThanOrEqual(-180)
    expect(dest.lon).toBeLessThanOrEqual(180)
    expect(dest.lon).toBeLessThan(0)
  })

  it('works near the poles without producing NaN', () => {
    const dest = destinationPoint(89.9, 0, 0, 1000)
    expect(Number.isFinite(dest.lat)).toBe(true)
    expect(Number.isFinite(dest.lon)).toBe(true)
    expect(dest.lat).toBeLessThanOrEqual(90)
  })
})

describe('parseAimDistanceMeters', () => {
  it('parses valid distances', () => {
    expect(parseAimDistanceMeters('200')).toBe(200)
    expect(parseAimDistanceMeters('200 m')).toBe(200)
    expect(parseAimDistanceMeters(99.6)).toBe(100)
    expect(parseAimDistanceMeters('  250  ')).toBe(250)
    expect(parseAimDistanceMeters(1)).toBe(1)
    expect(parseAimDistanceMeters(50_000)).toBe(50_000)
    expect(parseAimDistanceMeters(500_000)).toBe(500_000)
  })

  it('accepts every Aim sheet preset', () => {
    for (const preset of AIM_DISTANCE_PRESETS) {
      expect(parseAimDistanceMeters(preset)).toBe(preset)
      expect(parseAimDistanceMeters(String(preset))).toBe(preset)
    }
  })

  it('rejects invalid distances', () => {
    expect(parseAimDistanceMeters('')).toBeNull()
    expect(parseAimDistanceMeters('abc')).toBeNull()
    expect(parseAimDistanceMeters(0)).toBeNull()
    expect(parseAimDistanceMeters(-1)).toBeNull()
    expect(parseAimDistanceMeters(Number.NaN)).toBeNull()
    expect(parseAimDistanceMeters(Number.POSITIVE_INFINITY)).toBeNull()
    expect(parseAimDistanceMeters(0.4)).toBeNull()
  })
})
