import * as Haptics from '@/lib/haptics'
import { Pressable, Text, View } from 'react-native'

import { formatZoomChipLabel, type ZoomOption } from '@/lib/camera-zoom'
import { fonts } from '@/lib/fonts'
import { usesCommaDecimal } from '@/lib/i18n'
import { radii, useAppColors } from '@/lib/theme'

type Props = {
  options: ZoomOption[]
  selectedKey: string | null
  liveFactor: number
  onSelect: (option: ZoomOption) => void
  accessibilityPrefix: string
}

const CHIP = 30

export function ZoomControls({
  options,
  selectedKey,
  liveFactor,
  onSelect,
  accessibilityPrefix,
}: Props) {
  const colors = useAppColors()
  const useComma = usesCommaDecimal()

  if (options.length < 2) return null

  return (
    <View
      style={{
        flexDirection: 'row',
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
              minWidth: CHIP,
              height: CHIP,
              paddingHorizontal: label.length > 2 ? 7 : 0,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? '#F5D74E' : 'transparent',
            }}
          >
            <Text
              style={{
                fontFamily: fonts.semibold,
                fontSize: active ? 12 : 11,
                letterSpacing: -0.2,
                color: active ? '#171717' : colors.fg,
              }}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
