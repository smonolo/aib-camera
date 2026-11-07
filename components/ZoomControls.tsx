import * as Haptics from '@/lib/haptics'
import { Pressable, Text, View } from 'react-native'

import { formatZoomChipLabel, type ZoomOption } from '@/lib/camera-zoom'
import { fonts } from '@/lib/fonts'
import { useI18n } from '@/lib/i18n/locale-context'
import { radii, useAppColorScheme, useAppColors } from '@/lib/theme'

type Props = {
  options: ZoomOption[]
  selectedKey: string | null
  liveFactor: number
  onSelect: (option: ZoomOption) => void
  accessibilityPrefix: string
  direction?: 'row' | 'column'
}

const CHIP = 36

export function ZoomControls({
  options,
  selectedKey,
  liveFactor,
  onSelect,
  accessibilityPrefix,
  direction = 'row',
}: Props) {
  const colors = useAppColors()
  const scheme = useAppColorScheme()
  const { locale } = useI18n()
  const useComma = locale === 'it'
  const activeFill = scheme === 'dark' ? '#FFFFFF' : colors.fg
  const activeLabel = scheme === 'dark' ? '#171717' : colors.fgInverse

  if (options.length < 2) return null

  return (
    <View
      style={{
        flexDirection: direction,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        padding: 2,
        borderRadius: radii.full,
        backgroundColor: colors.surfaceMuted,
      }}
    >
      {options.map(option => {
        const active = option.key === selectedKey
        const label = formatZoomChipLabel(
          option,
          selectedKey,
          liveFactor,
          useComma
        )

        return (
          <Pressable
            key={option.key}
            onPress={() => {
              void Haptics.selectionAsync()
              onSelect(option)
            }}
            accessibilityLabel={`${accessibilityPrefix} ${label}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              width: CHIP,
              height: CHIP,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? activeFill : 'transparent',
            }}
          >
            <Text
              style={{
                fontFamily: fonts.semibold,
                fontSize: active ? 12 : 11,
                letterSpacing: -0.2,
                color: active ? activeLabel : colors.fg,
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
