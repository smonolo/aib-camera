import { useEffect, useState } from 'react'

import {
  captureGeoSnapshot,
  emptyGeoSnapshot,
  ensureForegroundLocationPermission,
  watchHeading,
  watchPosition,
} from './location'
import { warn } from './soft'
import type { GeoSnapshot } from './types'

type Listener = (geo: GeoSnapshot) => void

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
      })
      if (!active || generation !== startGeneration) return
      notify(snap)

      positionSub = await watchPosition(update => {
        if (!active || generation !== startGeneration) return
        notify({
          ...sharedGeo,
          ...update,
          takenAt: new Date(),
        })
      })

      headingSub = await watchHeading(heading => {
        if (!active || generation !== startGeneration) return
        notify({
          ...sharedGeo,
          heading,
          takenAt: sharedGeo.takenAt,
        })
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
