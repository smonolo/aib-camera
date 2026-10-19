import { View } from 'react-native'

import { StampBlock } from '@/components/StampBlock'
import type { StampSettings } from '@/lib/types'
import { useLiveGeoSnapshot } from '@/lib/use-live-geo'

type Props = {
  settings: StampSettings
}

export function StampPreview({ settings }: Props) {
  const geo = useLiveGeoSnapshot()

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
