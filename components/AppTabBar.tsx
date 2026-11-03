import { BlurView } from 'expo-blur'
import { router, usePathname } from 'expo-router'
import { TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui'
import { useCallback, useEffect, useMemo } from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon, type AppIconName } from '@/components/AppIcon'
import * as Haptics from '@/lib/haptics'
import { useI18n } from '@/lib/i18n/locale-context'
import { TAB_BAR, tabBarBottomOffset } from '@/lib/layout'
import { useTabBlurTarget } from '@/lib/tab-blur'
import { radii, useAppColorScheme, useAppColors } from '@/lib/theme'

type TabDef = {
  name: string
  href: '/' | '/gallery' | '/settings'
  label: string
  icon: AppIconName
}

const SPRING = { damping: 22, stiffness: 280, mass: 0.8 } as const

function tabIndexFromPath(pathname: string): number {
  if (pathname.startsWith('/gallery')) return 1
  if (pathname.startsWith('/settings')) return 2
  return 0
}

function TabItem({
  isFocused,
  label,
  icon,
  tint,
  onSelect,
  onPress,
  onLongPress,
}: Omit<TabTriggerSlotProps, 'ref'> & {
  label: string
  icon: AppIconName
  tint: string
  onSelect?: () => void
}) {
  return (
    <Pressable
      onPress={event => {
        onSelect?.()
        onPress?.(event)
      }}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
      style={{
        width: TAB_BAR.itemWidth,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}
    >
      <AppIcon
        name={icon}
        size={TAB_BAR.iconSize}
        color={tint}
        strokeWidth={isFocused ? 2.25 : 1.75}
      />
    </Pressable>
  )
}

export function AppTabBar() {
  const colors = useAppColors()
  const scheme = useAppColorScheme()
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const blurTargetRef = useTabBlurTarget()
  const { copy } = useI18n()

  const tabs: TabDef[] = useMemo(
    () => [
      {
        name: 'index',
        href: '/',
        label: copy.tabs.camera,
        icon: 'camera',
      },
      {
        name: 'gallery',
        href: '/gallery',
        label: copy.tabs.photos,
        icon: 'images',
      },
      {
        name: 'settings',
        href: '/settings',
        label: copy.tabs.settings,
        icon: 'settings',
      },
    ],
    [copy.tabs.camera, copy.tabs.photos, copy.tabs.settings]
  )

  const selectedIndex = tabIndexFromPath(pathname)
  const maxIndex = tabs.length - 1
  const bottomOffset = tabBarBottomOffset(insets.bottom)

  const position = useSharedValue(selectedIndex)
  const dragOrigin = useSharedValue(selectedIndex)
  const lastSnap = useSharedValue(selectedIndex)
  const dragging = useSharedValue(false)

  useEffect(() => {
    lastSnap.value = selectedIndex
    if (dragging.value) return
    position.value = withSpring(selectedIndex, SPRING)
  }, [selectedIndex, dragging, lastSnap, position])

  const selectIndex = useCallback(
    (index: number) => {
      const tab = tabs[index]
      if (!tab) return
      if (index === selectedIndex) return
      void Haptics.selectionAsync()
      router.navigate(tab.href)
    },
    [selectedIndex, tabs]
  )

  const finishDrag = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(maxIndex, Math.round(index)))
      selectIndex(target)
    },
    [maxIndex, selectIndex]
  )

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-16, 16])
    .onBegin(() => {
      cancelAnimation(position)
      dragging.value = true
      dragOrigin.value = position.value
      lastSnap.value = Math.round(position.value)
    })
    .onUpdate(event => {
      const next = Math.min(
        maxIndex,
        Math.max(0, dragOrigin.value + event.translationX / TAB_BAR.itemWidth)
      )
      position.value = next
      const snapped = Math.round(next)
      if (snapped !== lastSnap.value) {
        lastSnap.value = snapped
        runOnJS(selectIndex)(snapped)
      }
    })
    .onEnd(() => {
      const target = Math.max(0, Math.min(maxIndex, Math.round(position.value)))
      position.value = withSpring(target, SPRING)
      dragging.value = false
      runOnJS(finishDrag)(target)
    })
    .onFinalize(() => {
      dragging.value = false
    })

  const selectorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * TAB_BAR.itemWidth }],
  }))

  const barWidth = TAB_BAR.padding * 2 + TAB_BAR.itemWidth * tabs.length
  const glassTint = 'default' as const
  const wash =
    scheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'
  const selectorFill =
    scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.28)'

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingBottom: bottomOffset,
      }}
    >
      <GestureDetector gesture={pan}>
        <Animated.View
          accessibilityRole="tablist"
          style={{
            width: barWidth,
            height: TAB_BAR.height,
            borderRadius: radii.full,
            shadowColor: '#000000',
            shadowOpacity: 0.18,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
          }}
        >
          <View
            style={{
              flex: 1,
              borderRadius: radii.full,
              overflow: 'hidden',
              flexDirection: 'row',
              alignItems: 'stretch',
              padding: TAB_BAR.padding,
            }}
          >
            <BlurView
              intensity={40}
              tint={glassTint}
              {...(blurTargetRef != null
                ? {
                    blurTarget: blurTargetRef,
                    ...(Platform.OS === 'android'
                      ? {
                          blurMethod: 'dimezisBlurViewSdk31Plus' as const,
                          blurReductionFactor: 2,
                        }
                      : null),
                  }
                : null)}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: wash }]}
            />

            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: TAB_BAR.padding,
                  bottom: TAB_BAR.padding,
                  left: TAB_BAR.padding,
                  width: TAB_BAR.itemWidth,
                  borderRadius: radii.full,
                  backgroundColor: selectorFill,
                },
                selectorStyle,
              ]}
            />

            {tabs.map((tab, index) => {
              const focused = index === selectedIndex
              const tint = focused ? colors.fg : colors.muted
              return (
                <TabTrigger key={tab.name} name={tab.name} asChild>
                  <TabItem
                    label={tab.label}
                    icon={tab.icon}
                    tint={tint}
                    onSelect={() => {
                      position.value = withSpring(index, SPRING)
                      if (index !== selectedIndex) void Haptics.selectionAsync()
                    }}
                  />
                </TabTrigger>
              )
            })}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  )
}
