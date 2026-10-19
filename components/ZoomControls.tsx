import * as Haptics from 'expo-haptics'
import { Pressable, Text, View } from 'react-native'

import { formatZoomLabel, type ZoomOption } from '@/lib/camera-zoom'
import { fonts } from '@/lib/fonts'
import { getLocale } from '@/lib/i18n'

type Props = {
  options: ZoomOption[]
  selectedKey: string | null
  onSelect: (option: ZoomOption) => void
  accessibilityPrefix: string
}

const CHIP = 36

export function ZoomControls({
  options,
  selectedKey,
  onSelect,
  accessibilityPrefix,
}: Props) {
  const useComma = getLocale() === 'it'

  if (options.length < 2) return null

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        marginBottom: 14,
        padding: 3,
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.42)',
      }}
    >
      {options.map(option => {
        const active = option.key === selectedKey
        const label = formatZoomLabel(option.factor, useComma, active)

        return (
          <Pressable
            key={option.key}
            onPress={() => {
              void Haptics.selectionAsync()
              onSelect(option)
            }}
            accessibilityLabel={`${accessibilityPrefix} ${formatZoomLabel(option.factor, useComma, true)}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              width: CHIP,
              height: CHIP,
              borderRadius: CHIP / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? '#F5D74E' : 'transparent',
            }}
          >
            <Text
              style={{
                fontFamily: fonts.semibold,
                fontSize: active ? 13 : 12,
                letterSpacing: -0.2,
                color: active ? '#171717' : 'rgba(255,255,255,0.92)',
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
