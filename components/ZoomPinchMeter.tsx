import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import {
  formatLiveZoomFactor,
  pinchProgress,
  pinchStepMarks,
  type ZoomOption,
} from '@/lib/camera-zoom'
import { fonts } from '@/lib/fonts'
import { getLocale } from '@/lib/i18n'
import { radii } from '@/lib/theme'

type Props = {
  options: ZoomOption[]
  factor: number
  visible: boolean
}

const METER_WIDTH = 168
const TRACK_HEIGHT = 3
const TICK_WIDTH = 2
const TICK_HEIGHT = 8
const FADE_MS = 180

export function ZoomPinchMeter({ options, factor, visible }: Props) {
  const useComma = getLocale() === 'it'
  const progress = pinchProgress(options, factor)
  const steps = pinchStepMarks(options)
  const fillWidth = Math.max(TICK_WIDTH, progress * METER_WIDTH)
  const opacity = useSharedValue(visible ? 1 : 0)

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: FADE_MS })
  }, [visible, opacity])

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  if (options.length === 0) return null

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          bottom: '100%',
          marginBottom: 10,
          alignItems: 'center',
          width: METER_WIDTH,
        },
        fadeStyle,
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: 15,
          letterSpacing: -0.2,
          color: '#F5D74E',
          marginBottom: 8,
        }}
      >
        {formatLiveZoomFactor(factor, useComma)}
      </Text>

      <View
        style={{
          width: METER_WIDTH,
          height: TICK_HEIGHT,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            height: TRACK_HEIGHT,
            borderRadius: radii.full,
            backgroundColor: 'rgba(255,255,255,0.22)',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: fillWidth,
              height: '100%',
              borderRadius: radii.full,
              backgroundColor: '#F5D74E',
            }}
          />
        </View>

        {steps.map(step => (
          <View
            key={step.key}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: Math.min(
                METER_WIDTH - TICK_WIDTH,
                Math.max(0, step.progress * METER_WIDTH - TICK_WIDTH / 2)
              ),
              top: 0,
              width: TICK_WIDTH,
              height: TICK_HEIGHT,
              borderRadius: radii.full,
              backgroundColor:
                step.progress <= progress + 0.001
                  ? '#F5D74E'
                  : 'rgba(255,255,255,0.55)',
            }}
          />
        ))}
      </View>
    </Animated.View>
  )
}
