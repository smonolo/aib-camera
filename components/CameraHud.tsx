import { Text, View } from 'react-native'

import { GlassSurface } from '@/components/GlassSurface'
import { fonts } from '@/lib/fonts'
import { buildHudLines } from '@/lib/stamp'
import type { GeoSnapshot } from '@/lib/types'

type Props = {
  geo: GeoSnapshot
}

/** Fixed-size confirmation panel — avoids layout jumps as the clock ticks. */
const HUD_WIDTH = 196
const HUD_MIN_HEIGHT = 86
const LINE_HEIGHT = 18
const SLOT_COUNT = 4

export function CameraHud({ geo }: Props) {
  const lines = buildHudLines(geo)
  const slots = Array.from(
    { length: SLOT_COUNT },
    (_, index) => lines[index] ?? ' '
  )

  return (
    <View style={{ width: HUD_WIDTH }}>
      <GlassSurface
        forceDark
        style={{ borderRadius: 14, minHeight: HUD_MIN_HEIGHT }}
      >
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            minHeight: HUD_MIN_HEIGHT,
          }}
        >
          {slots.map((line, index) => (
            <Text
              key={`hud-${index}`}
              style={{
                fontFamily: fonts.medium,
                fontSize: 14,
                lineHeight: LINE_HEIGHT,
                color: line.trim() ? '#FAFAFA' : 'transparent',
                marginBottom: index === SLOT_COUNT - 1 ? 0 : 2,
              }}
              numberOfLines={1}
            >
              {line}
            </Text>
          ))}
        </View>
      </GlassSurface>
    </View>
  )
}
