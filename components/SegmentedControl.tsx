import * as Haptics from 'expo-haptics'
import { Pressable, Text, useColorScheme, View } from 'react-native'

import { fonts } from '@/lib/fonts'

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
  const scheme = useColorScheme()
  const track = scheme === 'dark' ? '#262626' : '#E5E5E5'
  const activeBg = scheme === 'dark' ? '#FAFAFA' : '#171717'
  const activeFg = scheme === 'dark' ? '#171717' : '#FAFAFA'
  const idleFg = scheme === 'dark' ? '#D4D4D4' : '#525252'

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: track,
        borderRadius: 12,
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
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? activeBg : 'transparent',
              paddingHorizontal: 6,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.medium,
                fontSize: 13,
                color: active ? activeFg : idleFg,
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
