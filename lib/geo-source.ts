import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

import { destinationPoint, parseAimDistanceMeters } from './geo-math'
import { reverseGeocodeCoords } from './location'
import { softTry, softVoid } from './soft'
import type { GeoSnapshot, GeoSourceMode, StickyTarget } from './types'
import { getSharedGeoSnapshot, useLiveGeoSnapshot } from './use-live-geo'

const GEO_SOURCE_KEY = 'aib-camera.geo-source.v1'

type GeoSourceState = {
  mode: GeoSourceMode
  sticky: StickyTarget | null
}

type Listener = (state: GeoSourceState) => void

let state: GeoSourceState = { mode: 'me', sticky: null }
let listeners = new Set<Listener>()
let hydrated = false
let hydratePromise: Promise<void> | null = null

function notify() {
  for (const listener of listeners) {
    listener(state)
  }
}

function setState(next: GeoSourceState) {
  state = next
  notify()
  void persistState()
}

async function persistState(): Promise<void> {
  await softVoid('Geo source persist failed', () =>
    AsyncStorage.setItem(GEO_SOURCE_KEY, JSON.stringify(state))
  )
}

function normalizeSticky(raw: unknown): StickyTarget | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Partial<StickyTarget>
  if (
    typeof o.lat !== 'number' ||
    typeof o.lon !== 'number' ||
    typeof o.distanceM !== 'number' ||
    typeof o.lockedHeading !== 'number' ||
    typeof o.lockedAt !== 'string'
  ) {
    return null
  }
  const distanceM = parseAimDistanceMeters(o.distanceM)
  if (distanceM == null) return null
  return {
    lat: o.lat,
    lon: o.lon,
    address: typeof o.address === 'string' ? o.address : null,
    distanceM,
    lockedHeading: o.lockedHeading,
    lockedAt: o.lockedAt,
  }
}

export async function hydrateGeoSource(): Promise<void> {
  if (hydrated) return
  if (hydratePromise) return hydratePromise

  hydratePromise = (async () => {
    const loaded = await softTry(
      'Geo source load failed',
      async () => {
        const raw = await AsyncStorage.getItem(GEO_SOURCE_KEY)
        if (!raw) return null
        return JSON.parse(raw) as Partial<GeoSourceState>
      },
      null
    )

    if (loaded) {
      const sticky = normalizeSticky(loaded.sticky)
      state = {
        sticky,
        mode: loaded.mode === 'target' && sticky != null ? 'target' : 'me',
      }
      notify()
    }
    hydrated = true
  })()

  try {
    await hydratePromise
  } finally {
    hydratePromise = null
  }
}

export function getGeoSourceState(): GeoSourceState {
  return state
}

export function buildEffectiveGeoSnapshot(
  live: GeoSnapshot,
  mode: GeoSourceMode,
  sticky: StickyTarget | null
): GeoSnapshot {
  if (mode !== 'target' || sticky == null) {
    return {
      ...live,
      isAimedTarget: false,
      targetDistanceM: null,
    }
  }

  return {
    lat: sticky.lat,
    lon: sticky.lon,
    accuracy: null,
    altitude: null,
    heading: sticky.lockedHeading,
    address: sticky.address,
    takenAt: live.takenAt,
    isAimedTarget: true,
    targetDistanceM: sticky.distanceM,
  }
}

export function getEffectiveGeoSnapshot(): GeoSnapshot {
  return buildEffectiveGeoSnapshot(
    getSharedGeoSnapshot(),
    state.mode,
    state.sticky
  )
}

export type LockTargetResult =
  | { ok: true; sticky: StickyTarget }
  | { ok: false; reason: 'no_gps' | 'no_heading' | 'bad_distance' }

export async function lockAimedTarget(
  distanceM: number
): Promise<LockTargetResult> {
  const distance = parseAimDistanceMeters(distanceM)
  if (distance == null) {
    return { ok: false, reason: 'bad_distance' }
  }

  const live = getSharedGeoSnapshot()
  if (live.lat == null || live.lon == null) {
    return { ok: false, reason: 'no_gps' }
  }
  if (live.heading == null) {
    return { ok: false, reason: 'no_heading' }
  }

  const dest = destinationPoint(live.lat, live.lon, live.heading, distance)
  const address = await reverseGeocodeCoords(dest.lat, dest.lon)
  const sticky: StickyTarget = {
    lat: dest.lat,
    lon: dest.lon,
    address,
    distanceM: distance,
    lockedHeading: live.heading,
    lockedAt: new Date().toISOString(),
  }

  setState({ mode: 'target', sticky })
  return { ok: true, sticky }
}

export function setGeoSourceMode(mode: GeoSourceMode): void {
  if (mode === 'target' && state.sticky == null) return
  if (state.mode === mode) return
  setState({ ...state, mode })
}

export function clearStickyTarget(): void {
  setState({ mode: 'me', sticky: null })
}

export function resetGeoSourceForTests(next?: GeoSourceState): void {
  state = next ?? { mode: 'me', sticky: null }
  hydrated = false
  hydratePromise = null
  notify()
}

export function useGeoSource(): GeoSourceState {
  const [current, setCurrent] = useState<GeoSourceState>(state)

  useEffect(() => {
    void hydrateGeoSource()
    listeners.add(setCurrent)
    setCurrent(state)
    return () => {
      listeners.delete(setCurrent)
    }
  }, [])

  return current
}

export function useEffectiveGeoSnapshot(): GeoSnapshot {
  const live = useLiveGeoSnapshot()
  const { mode, sticky } = useGeoSource()
  return buildEffectiveGeoSnapshot(live, mode, sticky)
}
