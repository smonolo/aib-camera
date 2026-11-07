import { memo, useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { fonts } from '@/lib/fonts'
import { useEffectiveGeoSnapshot } from '@/lib/geo-source'
import { useI18n } from '@/lib/i18n/locale-context'
import { useStampSettings } from '@/lib/settings-context'
import { buildStampContent, stampLayoutMetrics } from '@/lib/stamp'

type StampAppearance = {
  textColor: string
  backgroundColor: string
  backgroundAlpha?: number
}

type StampBoxProps = ReturnType<typeof stampLayoutMetrics> & {
  lines: string[]
  width: number
  textColor: string
  backgroundColor: string
}

const StampBox = memo(function StampBox({
  lines,
  fontSize,
  lineGap,
  boxPadX,
  boxPadY,
  radius,
  bgAlpha,
  scale,
  width,
  textColor,
  backgroundColor,
}: StampBoxProps) {
  if (lines.length === 0) return null

  const useShadow = bgAlpha < 0.55
  const darkText = textColor === '#000000' || textColor === '#000'

  return (
    <View
      style={{
        width,
        borderRadius: radius,
        backgroundColor:
          bgAlpha <= 0 ? 'transparent' : withAlpha(backgroundColor, bgAlpha),
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
            color: textColor,
            marginBottom: index === lines.length - 1 ? 0 : lineGap,
            ...(useShadow
              ? {
                  textShadowColor: darkText
                    ? 'rgba(255,255,255,0.9)'
                    : 'rgba(0,0,0,0.85)',
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
})

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('rgba(') || color.startsWith('rgb(')) return color
  const raw = color.replace('#', '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map(ch => ch + ch)
          .join('')
      : raw
  const value = Number.parseInt(full, 16)
  if (!Number.isFinite(value) || full.length !== 6) {
    return `rgba(0,0,0,${alpha})`
  }
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r},${g},${b},${alpha})`
}

type Props = {
  frameWidth: number
  scale?: number
  appearance?: StampAppearance
}

export function StampOverlay({ frameWidth, scale = 1, appearance }: Props) {
  const { settings } = useStampSettings()
  const { locale } = useI18n()
  const geo = useEffectiveGeoSnapshot()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!settings.showDateTime) return
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [settings.showDateTime])

  const width = Math.max(1, frameWidth)
  const metrics = stampLayoutMetrics(
    width * Math.max(0.25, Math.min(1, scale)),
    settings
  )
  const boxProps = {
    ...metrics,
    bgAlpha: appearance?.backgroundAlpha ?? metrics.bgAlpha,
    textColor: appearance?.textColor ?? '#FFFFFF',
    backgroundColor: appearance?.backgroundColor ?? '#000000',
    width: Math.max(1, width - metrics.edgePad * 2),
  }
  const stampGeo = settings.showDateTime ? { ...geo, takenAt: now } : geo
  const { infoLines, customLines } = buildStampContent(stampGeo, settings)

  return (
    <View
      key={locale}
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
