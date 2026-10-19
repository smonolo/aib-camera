import {
  DarkTheme,
  DefaultTheme,
  type Theme,
} from 'expo-router/react-navigation'

import { fonts } from './fonts'

export const lightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#404040',
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#171717',
    border: '#E5E5E5',
    notification: '#525252',
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: { ...DefaultTheme.fonts.regular, fontFamily: fonts.regular },
    medium: { ...DefaultTheme.fonts.medium, fontFamily: fonts.medium },
    bold: { ...DefaultTheme.fonts.bold, fontFamily: fonts.bold },
    heavy: { ...DefaultTheme.fonts.heavy, fontFamily: fonts.bold },
  },
}

export const darkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#D4D4D4',
    background: '#111111',
    card: '#1A1A1A',
    text: '#FAFAFA',
    border: '#2A2A2A',
    notification: '#A3A3A3',
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
