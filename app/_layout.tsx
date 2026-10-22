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
import { NavigationBar } from 'expo-navigation-bar'
import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { useEffect } from 'react'
import { Platform, Text, TextInput, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import 'react-native-reanimated'

import { ToastProvider } from '@/components/Toast'
import { fonts, setCustomFontsReady } from '@/lib/fonts'
import { warn } from '@/lib/soft'
import { SettingsProvider } from '@/lib/settings-context'
import {
  navigationTheme,
  palette,
  useAppColorScheme,
  useAppColors,
} from '@/lib/theme'

export { ErrorBoundary } from 'expo-router'

void SplashScreen.preventAutoHideAsync().catch(() => {})

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

export default function RootLayout() {
  const colorScheme = useAppColorScheme()
  const colors = useAppColors()
  const [fontsReady, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  })

  const uiReady = fontsReady || fontError != null

  useEffect(() => {
    if (fontsReady) {
      setCustomFontsReady(true)
      return
    }
    if (fontError) {
      setCustomFontsReady(false)
      warn('Custom fonts unavailable; using system fonts', fontError)
    }
  }, [fontsReady, fontError])

  useEffect(() => {
    if (!uiReady) return
    if (fontsReady) applyDefaultFont()
    void SplashScreen.hideAsync().catch(() => {})
  }, [uiReady, fontsReady])

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(
      colorScheme === 'dark' ? palette.dark.canvas : palette.light.canvas
    ).catch(() => {})
  }, [colorScheme])

  useEffect(() => {
    if (Platform.OS !== 'android') return
    try {
      NavigationBar.setStyle(colorScheme === 'dark' ? 'light' : 'dark')
    } catch {}
  }, [colorScheme])

  if (!uiReady) {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />
  }

  return (
    <GestureHandlerRootView className="flex-1 bg-canvas dark:bg-canvas-inverse">
      <ThemeProvider value={navigationTheme(colorScheme)}>
        <SettingsProvider>
          <ToastProvider>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            {Platform.OS === 'android' ? (
              <NavigationBar
                style={colorScheme === 'dark' ? 'light' : 'dark'}
              />
            ) : null}
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
              <Stack.Screen
                name="(tabs)"
                options={{ headerShown: false, title: '' }}
              />
              <Stack.Screen
                name="photo/[id]"
                options={{
                  headerShown: false,
                  presentation: 'card',
                  animation: 'fade',
                }}
              />
              <Stack.Screen
                name="audit-log"
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="configuration"
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />
            </Stack>
          </ToastProvider>
        </SettingsProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
