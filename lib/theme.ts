import { DarkTheme, DefaultTheme, type Theme } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Appearance,
  useColorScheme as useSystemColorScheme,
} from 'react-native'

import { fonts } from './fonts'

export type AppColorScheme = 'light' | 'dark'

export function useAppColorScheme(): AppColorScheme {
  const system = useSystemColorScheme()
  const [scheme, setScheme] = useState<AppColorScheme>(() =>
    resolveScheme(Appearance.getColorScheme() ?? system)
  )

  useEffect(() => {
    setScheme(resolveScheme(Appearance.getColorScheme() ?? system))
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme(resolveScheme(colorScheme))
    })
    return () => sub.remove()
  }, [system])

  return scheme
}

function resolveScheme(value: string | null | undefined): AppColorScheme {
  return value === 'dark' ? 'dark' : 'light'
}

export const palette = {
  light: {
    canvas: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceMuted: '#E5E5E5',
    fg: '#171717',
    fgInverse: '#FAFAFA',
    muted: '#525252',
    border: '#E5E5E5',
    borderStrong: '#D4D4D4',
    track: '#E5E5E5',
    trackActive: '#404040',
    trackIdle: '#525252',
    placeholder: '#A3A3A3',
    selection: '#525252',
  },
  dark: {
    canvas: '#111111',
    surface: '#1A1A1A',
    surfaceMuted: '#262626',
    fg: '#FAFAFA',
    fgInverse: '#171717',
    muted: '#A3A3A3',
    border: '#2A2A2A',
    borderStrong: '#525252',
    track: '#262626',
    trackActive: '#404040',
    trackIdle: '#D4D4D4',
    placeholder: '#737373',
    selection: '#A3A3A3',
  },
} as const

export const radii = {
  sm: 12,
  md: 16,
  full: 999,
} as const

export const cameraOverlay = {
  fill: 'rgba(0,0,0,0.42)',
  text: 'rgba(255,255,255,0.92)',
  stroke: 'rgba(255,255,255,0.4)',
} as const

export type AppColors = {
  [K in keyof (typeof palette)['light']]: string
}

export function useAppColors(): AppColors {
  const scheme = useAppColorScheme()
  return scheme === 'dark' ? palette.dark : palette.light
}

const lightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.light.trackActive,
    background: palette.light.canvas,
    card: palette.light.surface,
    text: palette.light.fg,
    border: palette.light.border,
    notification: palette.light.muted,
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: { ...DefaultTheme.fonts.regular, fontFamily: fonts.regular },
    medium: { ...DefaultTheme.fonts.medium, fontFamily: fonts.medium },
    bold: { ...DefaultTheme.fonts.bold, fontFamily: fonts.bold },
    heavy: { ...DefaultTheme.fonts.heavy, fontFamily: fonts.bold },
  },
}

const darkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#D4D4D4',
    background: palette.dark.canvas,
    card: palette.dark.surface,
    text: palette.dark.fg,
    border: palette.dark.border,
    notification: palette.dark.muted,
  },
  fonts: {
    ...DarkTheme.fonts,
    regular: { ...DarkTheme.fonts.regular, fontFamily: fonts.regular },
    medium: { ...DarkTheme.fonts.medium, fontFamily: fonts.medium },
    bold: { ...DarkTheme.fonts.bold, fontFamily: fonts.bold },
    heavy: { ...DarkTheme.fonts.heavy, fontFamily: fonts.bold },
  },
}

export function navigationTheme(scheme: string | null | undefined): Theme {
  return scheme === 'dark' ? darkTheme : lightTheme
}
