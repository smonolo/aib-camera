import { View } from 'react-native'

import { StampBlock } from '@/components/StampBlock'
import { stampPlacement } from '@/lib/stamp'
import type { GeoSnapshot, StampSettings } from '@/lib/types'

type Props = {
  geo: GeoSnapshot
  settings: StampSettings
}

export function StampOverlay({ geo, settings }: Props) {
  const placement = stampPlacement(settings.position)

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: placement.top,
        bottom: placement.bottom,
        left: 16,
        right: 16,
      }}
    >
      <StampBlock geo={geo} settings={settings} />
    </View>
  )
}
