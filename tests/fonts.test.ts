import { fonts, setCustomFontsReady } from '@/lib/fonts'

describe('fonts', () => {
  afterEach(() => {
    setCustomFontsReady(false)
  })

  it('falls back to system fonts before custom fonts are ready', () => {
    setCustomFontsReady(false)
    expect(fonts.regular).not.toMatch(/^Geist_/)
    expect(fonts.semibold).not.toMatch(/^Geist_/)
  })

  it('switches to Geist once custom fonts are ready', () => {
    setCustomFontsReady(true)
    expect(fonts.regular).toBe('Geist_400Regular')
    expect(fonts.medium).toBe('Geist_500Medium')
    expect(fonts.semibold).toBe('Geist_600SemiBold')
    expect(fonts.bold).toBe('Geist_700Bold')
  })
})
