import '../global.css'

import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  useFonts,
} from '@expo-google-fonts/geist'
import { Stack } from 'expo-router'
import { ThemeProvider } from 'expo-router/react-navigation'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Text, TextInput, useColorScheme, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import 'react-native-reanimated'

import { AppMark } from '@/components/AppMark'
import { ToastProvider } from '@/components/Toast'
import { fonts } from '@/lib/fonts'
import { SettingsProvider } from '@/lib/settings-context'
import { navigationTheme, useAppColors } from '@/lib/theme'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

const SPLASH_HOLD_MS = 700

function applyDefaultFont() {
  const textDefaults =
    (Text as unknown as { defaultProps?: { style?: object } }).defaultProps ??
    {}
  ;(Text as unknown as { defaultProps: object }).defaultProps = {
    ...textDefaults,
    style: [{ fontFamily: fonts.regular }, textDefaults.style],
  }

  const inputDefaults =
    (TextInput as unknown as { defaultProps?: { style?: object } })
      .defaultProps ?? {}
  ;(TextInput as unknown as { defaultProps: object }).defaultProps = {
    ...inputDefaults,
    style: [{ fontFamily: fonts.regular }, inputDefaults.style],
  }
}

function LoadingScreen({ fontsReady }: { fontsReady: boolean }) {
  const colors = useAppColors()
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.canvas,
      }}
    >
      <AppMark size="medium" showTitle={fontsReady} />
    </View>
  )
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const colors = useAppColors()
  const [fontsReady, error] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  })
  const [splashDone, setSplashDone] = useState(false)

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (!fontsReady) return
    applyDefaultFont()
    void SplashScreen.hideAsync()
    const timer = setTimeout(() => setSplashDone(true), SPLASH_HOLD_MS)
    return () => clearTimeout(timer)
  }, [fontsReady])

  if (!fontsReady || !splashDone) {
    return <LoadingScreen fontsReady={fontsReady} />
  }

  return (
    <GestureHandlerRootView className="flex-1 bg-canvas dark:bg-canvas-inverse">
      <ThemeProvider value={navigationTheme(colorScheme)}>
        <SettingsProvider>
          <ToastProvider>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.canvas },
                headerStyle: { backgroundColor: colors.canvas },
                headerTintColor: colors.fg,
                headerTitleStyle: {
                  fontFamily: fonts.semibold,
                  fontWeight: '600',
                },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="review"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.canvas },
                }}
              />
              <Stack.Screen
                name="photo/[id]"
                options={{
                  headerShown: false,
                  presentation: 'card',
                  animation: 'fade',
                }}
              />
            </Stack>
          </ToastProvider>
        </SettingsProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
