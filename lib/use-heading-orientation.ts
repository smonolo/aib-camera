import * as ScreenOrientation from 'expo-screen-orientation'
import { useEffect } from 'react'

import { headingOffsetForScreenOrientation } from '@/lib/location'
import { warn } from '@/lib/soft'
import { applyHeadingOrientationOffset } from '@/lib/use-live-geo'

export function useHeadingOrientationSync(): void {
  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const orientation = await ScreenOrientation.getOrientationAsync()
        if (!active) return
        applyHeadingOrientationOffset(
          headingOffsetForScreenOrientation(orientation)
        )
      } catch (error) {
        warn('Heading orientation sync failed', error)
      }
    })()

    const subscription = ScreenOrientation.addOrientationChangeListener(
      event => {
        applyHeadingOrientationOffset(
          headingOffsetForScreenOrientation(event.orientationInfo.orientation)
        )
      }
    )

    return () => {
      active = false
      subscription.remove()
    }
  }, [])
}
