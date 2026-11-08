import { useEffect, useState } from 'react'

import {
  captureGeoSnapshot,
  emptyGeoSnapshot,
  ensureForegroundLocationPermission,
  setHeadingOrientationOffset,
  watchHeading,
  watchPosition,
} from './location'
import { warn } from './soft'
import type { GeoSnapshot } from './types'

type Listener = (geo: GeoSnapshot) => void

type PositionUpdate = Pick<
  GeoSnapshot,
  'lat' | 'lon' | 'accuracy' | 'altitude' | 'address'
>

let sharedGeo: GeoSnapshot = emptyGeoSnapshot()
let listeners = new Set<Listener>()
let refCount = 0
let positionSub: { remove: () => void } | null = null
let headingSub: { remove: () => void } | null = null
let startGeneration = 0

function notify(next: GeoSnapshot) {
  sharedGeo = next
  for (const listener of listeners) {
    listener(next)
  }
}

export function mergeHeadingUpdate(
  current: GeoSnapshot,
  heading: number | null
): GeoSnapshot {
  const nextHeading =
    heading != null && Number.isFinite(heading) ? heading : current.heading
  return {
    ...current,
    heading: nextHeading,
    takenAt: current.takenAt,
  }
}

export function mergePositionUpdate(
  current: GeoSnapshot,
  update: PositionUpdate,
  takenAt: Date = new Date()
): GeoSnapshot | null {
  if (
    typeof update.lat !== 'number' ||
    typeof update.lon !== 'number' ||
    !Number.isFinite(update.lat) ||
    !Number.isFinite(update.lon)
  ) {
    return null
  }
  return {
    ...current,
    ...update,
    takenAt,
  }
}

function startShared() {
  const generation = ++startGeneration
  let active = true

  void (async () => {
    try {
      await ensureForegroundLocationPermission()
      if (!active || generation !== startGeneration) return

      const snap = await captureGeoSnapshot({
        headingHint: sharedGeo.heading,
        positionTimeoutMs: 5000,
        skipHeadingFetch: true,
      })
      if (!active || generation !== startGeneration) return
      notify(snap)

      positionSub = await watchPosition(update => {
        if (!active || generation !== startGeneration) return
        const next = mergePositionUpdate(sharedGeo, update)
        if (!next) return
        notify(next)
      })

      headingSub = await watchHeading(heading => {
        if (!active || generation !== startGeneration) return
        notify(mergeHeadingUpdate(sharedGeo, heading))
      })
    } catch (error) {
      warn('Live geo start failed; continuing without GPS', error)
      if (active && generation === startGeneration) {
        notify(emptyGeoSnapshot())
      }
    }
  })()

  return () => {
    active = false
  }
}

function stopShared(cancelStart: () => void) {
  cancelStart()
  startGeneration += 1
  positionSub?.remove()
  positionSub = null
  headingSub?.remove()
  headingSub = null
}

export function getSharedGeoSnapshot(): GeoSnapshot {
  return sharedGeo
}

export function applyHeadingOrientationOffset(offset: number): void {
  const heading = setHeadingOrientationOffset(offset)
  if (heading == null || !Number.isFinite(heading)) return
  notify(mergeHeadingUpdate(sharedGeo, heading))
}

export function resetLiveGeoForTests(next?: GeoSnapshot): void {
  stopShared(() => {})
  sharedGeo = next ?? emptyGeoSnapshot()
  listeners = new Set()
  refCount = 0
}

export function useLiveGeoSnapshot(): GeoSnapshot {
  const [geo, setGeo] = useState<GeoSnapshot>(sharedGeo)

  useEffect(() => {
    listeners.add(setGeo)
    refCount += 1

    let cancelStart = () => {}
    if (refCount === 1) {
      cancelStart = startShared()
    } else {
      setGeo(sharedGeo)
    }

    return () => {
      listeners.delete(setGeo)
      refCount -= 1
      if (refCount === 0) {
        stopShared(cancelStart)
      }
    }
  }, [])

  return geo
}
