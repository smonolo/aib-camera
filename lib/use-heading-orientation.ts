import * as ScreenOrientation from 'expo-screen-orientation'
import { useEffect } from 'react'

import {
  headingOffsetForScreenOrientation,
  setHeadingOrientationOffset,
} from '@/lib/location'
import { warn } from '@/lib/soft'

export function useHeadingOrientationSync(): void {
  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const orientation = await ScreenOrientation.getOrientationAsync()
        if (!active) return
        setHeadingOrientationOffset(
          headingOffsetForScreenOrientation(orientation)
        )
      } catch (error) {
        warn('Heading orientation sync failed', error)
      }
    })()

    const subscription = ScreenOrientation.addOrientationChangeListener(
      event => {
        setHeadingOrientationOffset(
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
