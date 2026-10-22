import {
  cloneStampSettings,
  DEFAULT_STAMP_SETTINGS,
  normalizeStampSettings,
} from '@/lib/types'

describe('cloneStampSettings', () => {
  it('copies custom lines by value', () => {
    const original = { ...DEFAULT_STAMP_SETTINGS, customLines: ['one'] }
    const cloned = cloneStampSettings(original)
    cloned.customLines.push('two')
    expect(original.customLines).toEqual(['one'])
    expect(cloned.customLines).toEqual(['one', 'two'])
  })
})

describe('normalizeStampSettings', () => {
  it('returns defaults for empty input', () => {
    expect(normalizeStampSettings(null)).toEqual(DEFAULT_STAMP_SETTINGS)
    expect(normalizeStampSettings(undefined)).toEqual(DEFAULT_STAMP_SETTINGS)
  })

  it('merges partial settings', () => {
    const next = normalizeStampSettings({
      showAltitude: false,
      fontSize: 'large',
      customLines: ['Squadra Nord'],
    })
    expect(next.showAltitude).toBe(false)
    expect(next.fontSize).toBe('large')
    expect(next.customLines).toEqual(['Squadra Nord'])
    expect(next.showDateTime).toBe(true)
  })

  it('maps legacy numeric fontSize', () => {
    expect(normalizeStampSettings({ fontSize: 10 } as never).fontSize).toBe(
      'small'
    )
    expect(normalizeStampSettings({ fontSize: 14 } as never).fontSize).toBe(
      'medium'
    )
    expect(normalizeStampSettings({ fontSize: 20 } as never).fontSize).toBe(
      'large'
    )
  })

  it('snaps legacy opacity to nearest step', () => {
    expect(normalizeStampSettings({ opacity: 0.3 } as never).opacity).toBe(0.25)
    expect(normalizeStampSettings({ opacity: 0.9 } as never).opacity).toBe(1)
  })

  it('forces white text color', () => {
    expect(normalizeStampSettings({ textColor: '#ff0000' }).textColor).toBe(
      '#FFFFFF'
    )
  })

  it('strips legacy layout keys', () => {
    const next = normalizeStampSettings({
      corner: 'tl',
      position: 'bottom',
    } as never)
    expect(next).not.toHaveProperty('corner')
    expect(next).not.toHaveProperty('position')
  })
})
