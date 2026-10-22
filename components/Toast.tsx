import * as Haptics from 'expo-haptics'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Pressable, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/AppIcon'
import { fonts } from '@/lib/fonts'
import { radii, useAppColors, useIsDark } from '@/lib/theme'

type ToastTone = 'error' | 'success' | 'info'

type ToastPayload = {
  id: number
  title: string
  message?: string
  tone: ToastTone
}

type ToastContextValue = {
  showToast: (input: {
    title: string
    message?: string
    tone?: ToastTone
  }) => void
  showError: (title: string, message?: string) => void
  showSuccess: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DISMISS_Y = -120
const SWIPE_THRESHOLD = -36

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  const colors = useAppColors()
  const isDark = useIsDark()
  const [toast, setToast] = useState<ToastPayload | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seq = useRef(0)
  const translateY = useSharedValue(0)
  const opacity = useSharedValue(1)

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const hideToast = useCallback((id: number) => {
    setToast(current => (current?.id === id ? null : current))
  }, [])

  const dismiss = useCallback(() => {
    clearTimer()
    const id = seq.current
    translateY.value = withTiming(DISMISS_Y, { duration: 160 })
    opacity.value = withTiming(0, { duration: 140 }, finished => {
      if (finished) runOnJS(hideToast)(id)
    })
  }, [clearTimer, hideToast, opacity, translateY])

  const showToast = useCallback(
    ({
      title,
      message,
      tone = 'info',
    }: {
      title: string
      message?: string
      tone?: ToastTone
    }) => {
      clearTimer()
      seq.current += 1
      const id = seq.current
      translateY.value = 0
      opacity.value = 1
      setToast({ id, title, message, tone })

      if (tone === 'error') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } else if (tone === 'success') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else {
        void Haptics.selectionAsync()
      }

      timer.current = setTimeout(() => {
        if (seq.current === id) dismiss()
      }, 4200)
    },
    [clearTimer, dismiss, opacity, translateY]
  )

  useEffect(() => () => clearTimer(), [clearTimer])

  const value = useMemo(
    () => ({
      showToast,
      showError: (title: string, message?: string) =>
        showToast({ title, message, tone: 'error' }),
      showSuccess: (title: string, message?: string) =>
        showToast({ title, message, tone: 'success' }),
    }),
    [showToast]
  )

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-8, 8])
        .onUpdate(event => {
          translateY.value = Math.min(12, event.translationY)
          opacity.value = Math.max(
            0.35,
            1 + Math.min(0, event.translationY) / 100
          )
        })
        .onEnd(event => {
          if (event.translationY < SWIPE_THRESHOLD || event.velocityY < -650) {
            runOnJS(dismiss)()
            return
          }
          translateY.value = withSpring(0, { damping: 18, stiffness: 220 })
          opacity.value = withSpring(1)
        }),
    [dismiss, opacity, translateY]
  )

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  const iconColor =
    toast?.tone === 'error'
      ? isDark
        ? '#FCA5A5'
        : '#B91C1C'
      : toast?.tone === 'success'
        ? isDark
          ? '#86EFAC'
          : '#15803D'
        : isDark
          ? '#D4D4D4'
          : colors.trackActive

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: insets.top + 8,
            zIndex: 1000,
            elevation: 1000,
            paddingHorizontal: 16,
          }}
        >
          <Animated.View entering={FadeInUp.duration(180)}>
            <GestureDetector gesture={pan}>
              <Animated.View style={animatedStyle}>
                <Pressable onPress={dismiss}>
                  <View
                    style={{
                      borderRadius: radii.md,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      shadowColor: '#000',
                      shadowOpacity: isDark ? 0.45 : 0.12,
                      shadowRadius: 16,
                      shadowOffset: { width: 0, height: 8 },
                      elevation: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                      }}
                    >
                      <AppIcon
                        sf={
                          toast.tone === 'error'
                            ? 'exclamationmark.triangle.fill'
                            : toast.tone === 'success'
                              ? 'checkmark.circle.fill'
                              : 'info.circle.fill'
                        }
                        material={
                          toast.tone === 'error'
                            ? 'error-outline'
                            : toast.tone === 'success'
                              ? 'check-circle-outline'
                              : 'info-outline'
                        }
                        color={iconColor}
                        size={22}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            fontFamily: fonts.semibold,
                            fontSize: 15,
                            color: colors.fg,
                          }}
                        >
                          {toast.title}
                        </Text>
                        {toast.message ? (
                          <Text
                            style={{
                              fontFamily: fonts.regular,
                              fontSize: 13,
                              lineHeight: 20,
                              color: colors.muted,
                              marginTop: 2,
                            }}
                          >
                            {toast.message}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            </GestureDetector>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

export { errorMessage } from '@/lib/errors'
