import { BlurView } from 'expo-blur'
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect'
import { useEffect, useState, type ReactNode } from 'react'
import {
  AccessibilityInfo,
  Platform,
  useColorScheme,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

type Props = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  interactive?: boolean
  className?: string
  forceDark?: boolean
  /** Clip children to border radius (use for buttons; avoid on large glass panels). */
  clipped?: boolean
}

export function GlassSurface({
  children,
  style,
  interactive = false,
  className,
  forceDark = false,
  clipped = false,
}: Props) {
  const scheme = useColorScheme()
  const isDark = forceDark || scheme === 'dark'
  const [reduceTransparency, setReduceTransparency] = useState(false)

  useEffect(() => {
    let mounted = true
    void AccessibilityInfo.isReduceTransparencyEnabled().then(enabled => {
      if (mounted) setReduceTransparency(enabled)
    })
    const sub = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      enabled => {
        setReduceTransparency(enabled)
      }
    )
    return () => {
      mounted = false
      sub.remove()
    }
  }, [])

  if (reduceTransparency) {
    return (
      <View
        className={className}
        style={[
          {
            backgroundColor: isDark
              ? 'rgba(23,23,23,0.92)'
              : 'rgba(245,245,245,0.94)',
            overflow: clipped ? 'hidden' : undefined,
          },
          style,
        ]}
      >
        {children}
      </View>
    )
  }

  const canUseGlass =
    Platform.OS === 'ios' &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable()

  if (canUseGlass) {
    // Never put overflow:hidden on GlassView — it cuts the liquid glass rim.
    // For buttons, wrap content in an inner rounded view instead.
    return (
      <GlassView
        className={className}
        style={style}
        isInteractive={interactive}
        glassEffectStyle="regular"
        colorScheme={isDark ? 'dark' : 'light'}
      >
        {children}
      </GlassView>
    )
  }

  // Android (and older iOS): solid gray surfaces — cleaner than blur mush.
  if (Platform.OS === 'android' || Platform.OS === 'web') {
    return (
      <View
        className={className}
        style={[
          {
            backgroundColor: isDark
              ? 'rgba(28,28,28,0.92)'
              : 'rgba(245,245,245,0.94)',
            overflow: clipped ? 'hidden' : undefined,
          },
          style,
        ]}
      >
        {children}
      </View>
    )
  }

  return (
    <BlurView
      className={className}
      intensity={isDark ? 55 : 70}
      tint={isDark ? 'dark' : 'light'}
      style={[{ overflow: 'hidden' }, style]}
    >
      {children}
    </BlurView>
  )
}
