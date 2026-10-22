import * as Haptics from 'expo-haptics'
import { useRef, useState } from 'react'
import {
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { buildHudLines } from '@/lib/stamp'
import { cameraOverlay, radii } from '@/lib/theme'
import type { GeoSnapshot } from '@/lib/types'
import { useLiveGeoSnapshot } from '@/lib/use-live-geo'

const HUD_SIDE_RESERVE = 140
const HUD_MAX_WIDTH_COLLAPSED = 220
const HUD_MAX_WIDTH_EXPANDED = 300

const CORNER_STROKE = 1.5
const CORNER_INSET = 6
const CORNER_ARM = 4

const TIMING = {
  duration: 240,
  easing: Easing.out(Easing.cubic),
}

export function CameraHud() {
  const copy = t()
  const geo = useLiveGeoSnapshot()
  const { width: windowWidth } = useWindowDimensions()

  const [expanded, setExpanded] = useState(false)
  const sizedForExpanded = useRef<boolean | null>(null)

  const boxWidth = Math.min(
    expanded ? HUD_MAX_WIDTH_EXPANDED : HUD_MAX_WIDTH_COLLAPSED,
    windowWidth - HUD_SIDE_RESERVE
  )

  const widthSv = useSharedValue(0)
  const heightSv = useSharedValue(0)
  const ready = useSharedValue(false)

  const onProbeLayout = (event: LayoutChangeEvent) => {
    const h = event.nativeEvent.layout.height
    const w = boxWidth
    const expandedChanged = sizedForExpanded.current !== expanded

    if (!ready.value) {
      ready.value = true
      sizedForExpanded.current = expanded
      widthSv.value = w
      heightSv.value = h
      return
    }

    if (expandedChanged) {
      sizedForExpanded.current = expanded
      widthSv.value = withTiming(w, TIMING)
      heightSv.value = withTiming(h, TIMING)
      return
    }

    widthSv.value = w
    heightSv.value = h
  }

  const boxStyle = useAnimatedStyle(() => {
    if (!ready.value) return { opacity: 0 }
    return {
      opacity: 1,
      width: widthSv.value,
      height: heightSv.value,
    }
  })

  return (
    <View style={{ alignSelf: 'flex-end' }}>
      <View
        pointerEvents="none"
        collapsable={false}
        style={{ position: 'absolute', opacity: 0 }}
      >
        <HudBody
          width={boxWidth}
          expanded={expanded}
          geo={geo}
          onLayout={onProbeLayout}
        />
      </View>

      <Pressable
        onPress={() => {
          void Haptics.selectionAsync()
          setExpanded(current => !current)
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded ? copy.camera.hudCollapse : copy.camera.hudExpand
        }
      >
        <Animated.View
          style={[
            {
              overflow: 'hidden',
              alignItems: 'flex-end',
              borderRadius: radii.md,
              backgroundColor: cameraOverlay.fill,
            },
            boxStyle,
          ]}
        >
          <HudBody width={boxWidth} expanded={expanded} geo={geo} />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: CORNER_INSET,
              bottom: CORNER_INSET,
              width: radii.md - CORNER_INSET + CORNER_ARM,
              height: radii.md - CORNER_INSET + CORNER_ARM,
              borderBottomLeftRadius: Math.max(0, radii.md - CORNER_INSET),
              borderLeftWidth: CORNER_STROKE,
              borderBottomWidth: CORNER_STROKE,
              borderLeftColor: cameraOverlay.stroke,
              borderBottomColor: cameraOverlay.stroke,
            }}
          />
        </Animated.View>
      </Pressable>
    </View>
  )
}

function HudBody({
  width,
  expanded,
  geo,
  onLayout,
}: {
  width: number
  expanded: boolean
  geo: GeoSnapshot
  onLayout?: (event: LayoutChangeEvent) => void
}) {
  const addressMaxChars = Math.max(
    18,
    Math.floor((width - 28) / (expanded ? 6.2 : 6.5))
  )
  const lines = buildHudLines(geo, { addressMaxChars, expanded })

  return (
    <View
      onLayout={onLayout}
      collapsable={false}
      style={{
        width,
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 10,
      }}
    >
      {lines.map((line, index) => (
        <Text
          key={`hud-${index}`}
          style={{
            fontFamily: fonts.medium,
            fontSize: expanded ? 13 : 12,
            lineHeight: expanded ? 17 : 15,
            color: cameraOverlay.text,
            textAlign: 'right',
            marginBottom: index === lines.length - 1 ? 0 : expanded ? 3 : 1,
          }}
          numberOfLines={expanded ? 3 : 1}
        >
          {line}
        </Text>
      ))}
    </View>
  )
}
