import * as Haptics from 'expo-haptics'
import { useEffect } from 'react'
import { Pressable } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { useAppColors } from '@/lib/theme'

const WIDTH = 48
const HEIGHT = 28
const PAD = 2
const THUMB = HEIGHT - PAD * 2
const TRAVEL = WIDTH - THUMB - PAD * 2

type Props = {
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
}

export function Toggle({ value, onValueChange, disabled = false }: Props) {
  const colors = useAppColors()
  const progress = useSharedValue(value ? 1 : 0)

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 160 })
  }, [value, progress])

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }))

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        void Haptics.selectionAsync()
        onValueChange(!value)
      }}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Animated.View
        style={{
          width: WIDTH,
          height: HEIGHT,
          borderRadius: HEIGHT / 2,
          padding: PAD,
          justifyContent: 'center',
          backgroundColor: value ? colors.fg : colors.borderStrong,
        }}
      >
        <Animated.View
          style={[
            {
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: value ? colors.fgInverse : '#FFFFFF',
            },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  )
}
