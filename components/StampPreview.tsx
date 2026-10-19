import { type ReactNode } from 'react'
import { Text, View } from 'react-native'

import { StampBlock } from '@/components/StampBlock'
import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { buildCustomStampLines, buildInfoStampLines } from '@/lib/stamp'
import { useAppColors } from '@/lib/theme'
import type { StampSettings } from '@/lib/types'
import { useLiveGeoSnapshot } from '@/lib/use-live-geo'

type Props = {
  settings: StampSettings
}

export function StampPreview({ settings }: Props) {
  const geo = useLiveGeoSnapshot()
  const colors = useAppColors()
  const copy = t()
  const infoLines = buildInfoStampLines(geo, settings)
  const customLines = buildCustomStampLines(settings)

  return (
    <View style={{ marginBottom: 20, gap: 12 }}>
      <PreviewCard label={copy.settings.previewInfo} color={colors.muted}>
        <StampBlock lines={infoLines} settings={settings} previewScale={0.42} />
      </PreviewCard>

      <PreviewCard label={copy.settings.previewCustom} color={colors.muted}>
        <StampBlock
          lines={customLines}
          settings={settings}
          previewScale={0.42}
        />
      </PreviewCard>
    </View>
  )
}

function PreviewCard({
  label,
  color,
  children,
}: {
  label: string
  color: string
  children: ReactNode
}) {
  return (
    <View>
      <Text
        style={{
          fontFamily: fonts.medium,
          fontSize: 13,
          color,
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: '#737373',
          padding: 12,
        }}
      >
        {children}
      </View>
    </View>
  )
}
