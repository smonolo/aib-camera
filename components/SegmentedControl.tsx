import * as Haptics from '@/lib/haptics'
import { Pressable, Text, View } from 'react-native'

import { fonts } from '@/lib/fonts'
import { radii, useAppColors } from '@/lib/theme'

type Option<T extends string | number> = {
  value: T
  label: string
}

type Props<T extends string | number> = {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: Props<T>) {
  const colors = useAppColors()

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.track,
        borderRadius: radii.sm,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map(option => {
        const active = option.value === value
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => {
              void Haptics.selectionAsync()
              onChange(option.value)
            }}
            style={{
              flex: 1,
              minHeight: 36,
              borderRadius: radii.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.fg : 'transparent',
              paddingHorizontal: 6,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.medium,
                fontSize: 13,
                color: active ? colors.fgInverse : colors.trackIdle,
              }}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
