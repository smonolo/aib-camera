import { Geist_600SemiBold } from '@expo-google-fonts/geist'
import { Platform } from 'react-native'

const SYSTEM_FONTS = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  android: {
    regular: 'sans-serif',
    medium: 'sans-serif-medium',
    semibold: 'sans-serif-medium',
    bold: 'sans-serif-bold',
  },
  default: {
    regular: 'sans-serif',
    medium: 'sans-serif',
    semibold: 'sans-serif',
    bold: 'sans-serif',
  },
})!

const CUSTOM_FONTS = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
} as const

let customFontsReady = false

export function setCustomFontsReady(ready: boolean): void {
  customFontsReady = ready
}

export const fonts = {
  get regular() {
    return customFontsReady ? CUSTOM_FONTS.regular : SYSTEM_FONTS.regular
  },
  get medium() {
    return customFontsReady ? CUSTOM_FONTS.medium : SYSTEM_FONTS.medium
  },
  get semibold() {
    return customFontsReady ? CUSTOM_FONTS.semibold : SYSTEM_FONTS.semibold
  },
  get bold() {
    return customFontsReady ? CUSTOM_FONTS.bold : SYSTEM_FONTS.bold
  },
}

export const STAMP_FONT_ASSET = Geist_600SemiBold
