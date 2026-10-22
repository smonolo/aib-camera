jest.mock('expo-router', () => {
  const fonts = {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  }
  const colors = {
    primary: '#000',
    background: '#fff',
    card: '#fff',
    text: '#000',
    border: '#ccc',
    notification: '#f00',
  }
  return {
    DarkTheme: { dark: true, colors: { ...colors }, fonts },
    DefaultTheme: { dark: false, colors: { ...colors }, fonts },
  }
})

import { navigationTheme, palette } from '@/lib/theme'

describe('navigationTheme', () => {
  it('selects dark theme for dark scheme', () => {
    const theme = navigationTheme('dark')
    expect(theme.dark).toBe(true)
    expect(theme.colors.background).toBe(palette.dark.canvas)
  })

  it('defaults to light for other values', () => {
    expect(navigationTheme('light').dark).toBe(false)
    expect(navigationTheme(null).dark).toBe(false)
    expect(navigationTheme(undefined).colors.background).toBe(
      palette.light.canvas
    )
  })
})
