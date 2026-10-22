import { Platform, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStampSettings } from '@/lib/settings-context'
import {
  buildCustomStampLines,
  buildInfoStampLines,
  stampLayoutMetrics,
} from '@/lib/stamp'
import { useLiveGeoSnapshot } from '@/lib/use-live-geo'

const STAMP_FONT_FAMILY = Platform.select({
  ios: 'Helvetica',
  android: 'sans-serif-medium',
  default: 'System',
})

type StampBoxProps = ReturnType<typeof stampLayoutMetrics> & {
  lines: string[]
  width: number
}

function StampBox({
  lines,
  fontSize,
  lineGap,
  boxPadX,
  boxPadY,
  radius,
  bgAlpha,
  scale,
  width,
}: StampBoxProps) {
  if (lines.length === 0) return null

  const useShadow = bgAlpha < 0.55

  return (
    <View
      style={{
        width,
        borderRadius: radius,
        backgroundColor: `rgba(0,0,0,${bgAlpha})`,
        paddingHorizontal: boxPadX,
        paddingVertical: boxPadY,
      }}
    >
      {lines.map((line, index) => (
        <Text
          key={`stamp-${index}-${line.slice(0, 12)}`}
          style={{
            fontFamily: STAMP_FONT_FAMILY,
            fontWeight: '600',
            fontSize,
            lineHeight: fontSize + 2,
            color: '#FFFFFF',
            marginBottom: index === lines.length - 1 ? 0 : lineGap,
            ...(useShadow
              ? {
                  textShadowColor: 'rgba(0,0,0,0.85)',
                  textShadowOffset: {
                    width: 1.5 * scale,
                    height: 1.5 * scale,
                  },
                  textShadowRadius: 0.5,
                }
              : null),
          }}
        >
          {line}
        </Text>
      ))}
    </View>
  )
}

type Props = {
  bottomClearance: number
}

export function StampOverlay({ bottomClearance }: Props) {
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  const { settings } = useStampSettings()
  const geo = useLiveGeoSnapshot()

  const metrics = stampLayoutMetrics(windowWidth, settings)
  const boxProps = {
    ...metrics,
    width: Math.max(1, windowWidth - metrics.edgePad * 2),
  }
  const infoLines = buildInfoStampLines(geo, settings)
  const customLines = buildCustomStampLines(settings)

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    >
      <View
        style={{
          position: 'absolute',
          top: insets.top + metrics.edgePad,
          left: metrics.edgePad,
        }}
      >
        <StampBox {...boxProps} lines={infoLines} />
      </View>

      {customLines.length > 0 ? (
        <View
          style={{
            position: 'absolute',
            bottom: bottomClearance + metrics.edgePad,
            left: metrics.edgePad,
          }}
        >
          <StampBox {...boxProps} lines={customLines} />
        </View>
      ) : null}
    </View>
  )
}
