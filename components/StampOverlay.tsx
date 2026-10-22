import { Text, View } from 'react-native'

import { fonts } from '@/lib/fonts'
import { useStampSettings } from '@/lib/settings-context'
import { buildStampContent, stampLayoutMetrics } from '@/lib/stamp'
import { useLiveGeoSnapshot } from '@/lib/use-live-geo'

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
            fontFamily: fonts.semibold,
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
  frameWidth: number
}

export function StampOverlay({ frameWidth }: Props) {
  const { settings } = useStampSettings()
  const geo = useLiveGeoSnapshot()

  const width = Math.max(1, frameWidth)
  const metrics = stampLayoutMetrics(width, settings)
  const boxProps = {
    ...metrics,
    width: Math.max(1, width - metrics.edgePad * 2),
  }
  const { infoLines, customLines } = buildStampContent(geo, settings)

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    >
      <View
        style={{
          position: 'absolute',
          top: metrics.edgePad,
          left: metrics.edgePad,
        }}
      >
        <StampBox {...boxProps} lines={infoLines} />
      </View>

      {customLines.length > 0 ? (
        <View
          style={{
            position: 'absolute',
            bottom: metrics.edgePad,
            left: metrics.edgePad,
          }}
        >
          <StampBox {...boxProps} lines={customLines} />
        </View>
      ) : null}
    </View>
  )
}
