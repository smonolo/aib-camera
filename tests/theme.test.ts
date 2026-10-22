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
