import { Text, View } from 'react-native'

import { fonts } from '@/lib/fonts'
import { stampFontPx } from '@/lib/stamp'
import type { StampSettings } from '@/lib/types'

type Props = {
  lines: string[]
  settings: StampSettings
  previewScale?: number
}

export function StampBlock({ lines, settings, previewScale = 1 }: Props) {
  const fontSize = Math.round(stampFontPx(settings) * previewScale)
  const bgAlpha = Math.min(1, Math.max(0, settings.opacity))

  return (
    <View
      style={{
        alignSelf: 'stretch',
        width: '100%',
        backgroundColor: `rgba(0,0,0,${bgAlpha})`,
        paddingHorizontal: Math.round(14 * Math.max(previewScale, 0.55)),
        paddingVertical: Math.round(12 * Math.max(previewScale, 0.55)),
        borderRadius: 12,
      }}
    >
      {lines.length === 0 ? (
        <Text
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize,
            fontFamily: fonts.medium,
          }}
        >
          —
        </Text>
      ) : (
        lines.map((line, index) => (
          <Text
            key={`${index}-${line.slice(0, 24)}`}
            style={{
              color: '#FFFFFF',
              fontSize,
              fontFamily: fonts.semibold,
              lineHeight: Math.round(fontSize * 1.25),
              marginBottom: index === lines.length - 1 ? 0 : 3,
              flexShrink: 1,
              textShadowColor:
                bgAlpha < 0.55 ? 'rgba(0,0,0,0.85)' : 'transparent',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: bgAlpha < 0.55 ? 2 : 0,
            }}
          >
            {line}
          </Text>
        ))
      )}
    </View>
  )
}
