import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { StampBlock } from '@/components/StampBlock'
import { captureGeoSnapshot, watchPosition } from '@/lib/location'
import type { GeoSnapshot, StampSettings } from '@/lib/types'

type Props = {
  settings: StampSettings
}

/** Live content + opacity preview — uses current GPS/time, not sample data. */
export function StampPreview({ settings }: Props) {
  const [geo, setGeo] = useState<GeoSnapshot>({
    lat: null,
    lon: null,
    accuracy: null,
    address: null,
    takenAt: new Date(),
  })

  useEffect(() => {
    let active = true
    let sub: { remove: () => void } | null = null

    void (async () => {
      const snap = await captureGeoSnapshot()
      if (active) setGeo(snap)

      sub = await watchPosition(update => {
        if (!active) return
        setGeo(prev => ({
          ...prev,
          ...update,
          takenAt: new Date(),
        }))
      })
    })()

    const clock = setInterval(() => {
      setGeo(prev => ({ ...prev, takenAt: new Date() }))
    }, 1000)

    return () => {
      active = false
      sub?.remove()
      clearInterval(clock)
    }
  }, [])

  return (
    <View
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#737373',
        marginBottom: 20,
      }}
    >
      <StampBlock geo={geo} settings={settings} previewScale={0.42} />
    </View>
  )
}
