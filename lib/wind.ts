import { useEffect, useState } from 'react'

import { haversineMeters } from './geo-math'
import { geocodeCellKey, withTimeout } from './location'
import { softTry } from './soft'
import { findNearestWindCache, upsertWindCacheEntry } from './storage'
import type { WindSnapshot } from './types'

const WIND_TIMEOUT_MS = 1500
const WIND_STICKY_M = 2000
const WIND_TTL_MS = 15 * 60 * 1000
const WIND_STALE_MAX_MS = 60 * 60 * 1000

let memoryWind: WindSnapshot | null = null
let inflightKey: string | null = null
let inflight: Promise<WindSnapshot | null> | null = null

export function resetWindMemory(): void {
  memoryWind = null
  inflightKey = null
  inflight = null
}

function rememberWind(wind: WindSnapshot | null): void {
  memoryWind = wind
}

function isFresh(wind: WindSnapshot, now = Date.now()): boolean {
  return now - wind.fetchedAt <= WIND_TTL_MS
}

function isUsable(wind: WindSnapshot, now = Date.now()): boolean {
  return now - wind.fetchedAt <= WIND_STALE_MAX_MS
}

function matchesSticky(wind: WindSnapshot, lat: number, lon: number): boolean {
  return haversineMeters(lat, lon, wind.lat, wind.lon) <= WIND_STICKY_M
}

export function getCachedWindSync(
  lat: number,
  lon: number
): WindSnapshot | null {
  if (!memoryWind) return null
  if (!matchesSticky(memoryWind, lat, lon)) return null
  if (!isUsable(memoryWind)) return null
  return memoryWind
}

type OpenMeteoCurrentResponse = {
  current?: {
    wind_speed_10m?: number
    wind_direction_10m?: number
  }
}

function parseWindResponse(
  data: OpenMeteoCurrentResponse,
  lat: number,
  lon: number,
  fetchedAt: number
): WindSnapshot | null {
  const current = data.current
  if (!current) return null
  const speed = current.wind_speed_10m
  const direction = current.wind_direction_10m
  if (
    typeof speed !== 'number' ||
    !Number.isFinite(speed) ||
    typeof direction !== 'number' ||
    !Number.isFinite(direction)
  ) {
    return null
  }
  return {
    speedKmh: speed,
    directionDeg: ((direction % 360) + 360) % 360,
    fetchedAt,
    lat,
    lon,
  }
}

export async function fetchCurrentWind(
  lat: number,
  lon: number
): Promise<WindSnapshot | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(String(lat))}` +
    `&longitude=${encodeURIComponent(String(lon))}` +
    `&current=wind_speed_10m,wind_direction_10m` +
    `&wind_speed_unit=kmh`

  return softTry(
    'Wind fetch failed',
    async () => {
      const response = await withTimeout(
        fetch(url),
        WIND_TIMEOUT_MS,
        'wind-timeout'
      )
      if (!response.ok) return null
      const data = (await withTimeout(
        response.json(),
        WIND_TIMEOUT_MS,
        'wind-json-timeout'
      )) as OpenMeteoCurrentResponse
      return parseWindResponse(data, lat, lon, Date.now())
    },
    null
  )
}

async function loadStickyWind(
  lat: number,
  lon: number
): Promise<WindSnapshot | null> {
  if (
    memoryWind &&
    matchesSticky(memoryWind, lat, lon) &&
    isUsable(memoryWind)
  ) {
    return memoryWind
  }

  const cached = await softTry(
    'Wind cache read failed',
    () => findNearestWindCache(lat, lon, WIND_STICKY_M),
    null
  )
  if (!cached) return null

  const wind: WindSnapshot = {
    speedKmh: cached.speedKmh,
    directionDeg: cached.directionDeg,
    fetchedAt: cached.fetchedAt,
    lat: cached.lat,
    lon: cached.lon,
  }
  if (!isUsable(wind)) return null
  rememberWind(wind)
  return wind
}

export async function resolveWind(
  lat: number,
  lon: number
): Promise<WindSnapshot | null> {
  const sticky = await loadStickyWind(lat, lon)
  if (sticky && isFresh(sticky)) {
    return sticky
  }

  const key = geocodeCellKey(lat, lon)
  if (inflight && inflightKey === key) {
    const fetched = await inflight
    return fetched ?? sticky
  }

  inflightKey = key
  inflight = (async () => {
    const fetched = await fetchCurrentWind(lat, lon)
    if (fetched) {
      rememberWind(fetched)
      void upsertWindCacheEntry({
        key,
        speedKmh: fetched.speedKmh,
        directionDeg: fetched.directionDeg,
        fetchedAt: fetched.fetchedAt,
        lat: fetched.lat,
        lon: fetched.lon,
      })
      return fetched
    }
    return sticky
  })()

  try {
    return await inflight
  } finally {
    if (inflightKey === key) {
      inflightKey = null
      inflight = null
    }
  }
}

export function useWindForGeo(
  lat: number | null,
  lon: number | null
): WindSnapshot | null {
  const [wind, setWind] = useState<WindSnapshot | null>(() =>
    lat != null && lon != null ? getCachedWindSync(lat, lon) : null
  )

  useEffect(() => {
    if (lat == null || lon == null) {
      setWind(null)
      return
    }

    let cancelled = false
    const sync = getCachedWindSync(lat, lon)
    if (sync) setWind(sync)

    void resolveWind(lat, lon).then(next => {
      if (!cancelled) setWind(next)
    })

    return () => {
      cancelled = true
    }
  }, [lat, lon])

  return wind
}
