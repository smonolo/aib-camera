import { useEffect, useState } from 'react'

import { captureGeoSnapshot, watchPosition } from './location'
import type { GeoSnapshot } from './types'

const EMPTY_GEO: GeoSnapshot = {
  lat: null,
  lon: null,
  accuracy: null,
  address: null,
  takenAt: new Date(),
}

type Listener = (geo: GeoSnapshot) => void

let sharedGeo: GeoSnapshot = EMPTY_GEO
let listeners = new Set<Listener>()
let refCount = 0
let positionSub: { remove: () => void } | null = null
let clock: ReturnType<typeof setInterval> | null = null
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
    const snap = await captureGeoSnapshot()
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
  })()

  clock = setInterval(() => {
    notify({ ...sharedGeo, takenAt: new Date() })
  }, 1000)

  return () => {
    active = false
  }
}

function stopShared(cancelStart: () => void) {
  cancelStart()
  startGeneration += 1
  positionSub?.remove()
  positionSub = null
  if (clock) {
    clearInterval(clock)
    clock = null
  }
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
