import { Text, useWindowDimensions, View } from 'react-native'

import { GlassSurface } from '@/components/GlassSurface'
import { fonts } from '@/lib/fonts'
import { buildHudLines } from '@/lib/stamp'
import { useLiveGeoSnapshot } from '@/lib/use-live-geo'

/** Leave room for the flash chip on the left (~120) + horizontal padding. */
const HUD_SIDE_RESERVE = 140
const HUD_MAX_WIDTH = 280

export function CameraHud() {
  const geo = useLiveGeoSnapshot()
  const { width: windowWidth } = useWindowDimensions()
  const hudWidth = Math.min(HUD_MAX_WIDTH, windowWidth - HUD_SIDE_RESERVE)
  // ~7px per character at 14pt medium; keep a little padding margin.
  const addressMaxChars = Math.max(22, Math.floor((hudWidth - 24) / 7.2))
  const lines = buildHudLines(geo, { addressMaxChars })

  return (
    <View style={{ width: hudWidth, maxWidth: '100%' }}>
      <GlassSurface forceDark style={{ borderRadius: 14 }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
          {lines.map((line, index) => (
            <Text
              key={`hud-${index}-${line.slice(0, 12)}`}
              style={{
                fontFamily: fonts.medium,
                fontSize: 14,
                lineHeight: 18,
                color: '#FAFAFA',
                marginBottom: index === lines.length - 1 ? 0 : 2,
              }}
              numberOfLines={2}
            >
              {line}
            </Text>
          ))}
        </View>
      </GlassSurface>
    </View>
  )
}
