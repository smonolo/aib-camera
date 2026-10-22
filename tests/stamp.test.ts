import {
  buildCustomStampLines,
  buildHudLines,
  buildInfoStampLines,
  formatGalleryDayLabel,
  formatLatLon,
  formatStampDateTime,
  galleryDayKey,
  parseCustomLines,
  stampFontPx,
  wrapTextToWidth,
} from '@/lib/stamp'
import { DEFAULT_STAMP_SETTINGS, type GeoSnapshot } from '@/lib/types'

const takenAt = new Date('2024-07-15T14:30:45.000Z')

function geo(overrides: Partial<GeoSnapshot> = {}): GeoSnapshot {
  return {
    lat: 45.4642,
    lon: 9.19,
    accuracy: 8.4,
    altitude: 122,
    heading: 45,
    address: 'Milano, Lombardia',
    takenAt,
    ...overrides,
  }
}

describe('formatLatLon', () => {
  it('formats with default precision', () => {
    expect(formatLatLon(45.464211, 9.190011)).toBe('45.46421, 9.19001')
  })

  it('respects digit count', () => {
    expect(formatLatLon(45.4642, 9.19, 4)).toBe('45.4642, 9.1900')
  })
})

describe('formatStampDateTime', () => {
  it('formats iso in Europe/Rome', () => {
    expect(formatStampDateTime(takenAt, 'iso')).toBe('2024-07-15T16:30:45')
  })

  it('formats short Italian datetime', () => {
    expect(formatStampDateTime(takenAt, 'it-short')).toMatch(
      /15\/07\/2024.*16:30:45/
    )
  })
})

describe('galleryDayKey', () => {
  it('keys by Rome calendar day', () => {
    expect(galleryDayKey(takenAt.toISOString())).toBe('2024-07-15')
  })
})

describe('parseCustomLines', () => {
  it('keeps blank middle lines and drops trailing empty', () => {
    expect(parseCustomLines('A\n\nB\n')).toEqual(['A', '', 'B'])
  })

  it('limits lines', () => {
    expect(parseCustomLines('1\n2\n3\n4\n5', { max: 3 })).toEqual([
      '1',
      '2',
      '3',
    ])
  })

  it('can drop empty lines', () => {
    expect(parseCustomLines('A\n\nB', { dropEmpty: true })).toEqual(['A', 'B'])
  })
})

describe('buildInfoStampLines', () => {
  it('includes datetime, coords, meta, and address', () => {
    const lines = buildInfoStampLines(geo(), DEFAULT_STAMP_SETTINGS)
    expect(lines[0]).toContain('2024')
    expect(lines.some(line => line.includes('45.464200'))).toBe(true)
    expect(lines.some(line => line.includes('±8.4 m'))).toBe(true)
    expect(lines.some(line => line.includes('122 m'))).toBe(true)
    expect(lines.some(line => line.includes('45°'))).toBe(true)
    expect(lines.some(line => line.includes('Milano'))).toBe(true)
  })

  it('uses fallbacks when geo is missing', () => {
    const lines = buildInfoStampLines(
      geo({
        lat: null,
        lon: null,
        accuracy: null,
        altitude: null,
        heading: null,
        address: null,
      }),
      DEFAULT_STAMP_SETTINGS
    )
    expect(lines).toContain('Coordinate non disponibili')
    expect(lines).toContain('Luogo non disponibile')
    expect(lines.every(line => !line.includes('±'))).toBe(true)
  })

  it('honors visibility toggles', () => {
    const lines = buildInfoStampLines(geo(), {
      ...DEFAULT_STAMP_SETTINGS,
      showDateTime: false,
      showCoordinates: false,
      showAccuracy: false,
      showAltitude: false,
      showHeading: false,
      showAddress: false,
    })
    expect(lines).toEqual([])
  })
})

describe('buildCustomStampLines', () => {
  it('skips blank custom lines', () => {
    expect(
      buildCustomStampLines({
        ...DEFAULT_STAMP_SETTINGS,
        customLines: ['  Squadra Nord  ', '', '  '],
      })
    ).toEqual(['Squadra Nord'])
  })
})

describe('stampFontPx', () => {
  it('maps font size tokens', () => {
    expect(stampFontPx({ ...DEFAULT_STAMP_SETTINGS, fontSize: 'small' })).toBe(
      16
    )
    expect(stampFontPx({ ...DEFAULT_STAMP_SETTINGS, fontSize: 'medium' })).toBe(
      24
    )
    expect(stampFontPx({ ...DEFAULT_STAMP_SETTINGS, fontSize: 'large' })).toBe(
      32
    )
  })
})

describe('wrapTextToWidth', () => {
  const measure = (value: string) => value.length

  it('returns the original string when it fits', () => {
    expect(wrapTextToWidth('hello', 10, measure)).toEqual(['hello'])
  })

  it('wraps on word boundaries', () => {
    expect(wrapTextToWidth('alpha beta gamma', 10, measure)).toEqual([
      'alpha beta',
      'gamma',
    ])
  })

  it('breaks oversized tokens', () => {
    expect(wrapTextToWidth('supercalifragilistic', 8, measure)).toEqual([
      'supercal',
      'ifragili',
      'stic',
    ])
  })
})

describe('buildHudLines', () => {
  it('uses compact coords while acquiring GPS', () => {
    const lines = buildHudLines(geo({ lat: null, lon: null, address: null }), {
      expanded: false,
    })
    expect(lines[0]).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(lines).toContain('Acquisizione GPS…')
  })

  it('expands meta details when requested', () => {
    const lines = buildHudLines(geo(), { expanded: true })
    expect(lines.some(line => line.includes('45.464200'))).toBe(true)
    expect(lines.some(line => line.includes('±8.4 m'))).toBe(true)
    expect(lines.some(line => line.includes('Milano'))).toBe(true)
  })
})

describe('formatGalleryDayLabel', () => {
  it('labels today and yesterday', () => {
    const today = galleryDayKey(new Date().toISOString())
    const yesterdayDate = new Date(`${today}T12:00:00.000Z`)
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
    const yesterday = yesterdayDate.toISOString().slice(0, 10)

    expect(
      formatGalleryDayLabel(today, { today: 'Oggi', yesterday: 'Ieri' }, 'it')
    ).toBe('Oggi')
    expect(
      formatGalleryDayLabel(
        yesterday,
        { today: 'Oggi', yesterday: 'Ieri' },
        'it'
      )
    ).toBe('Ieri')
  })

  it('formats older days with the requested locale', () => {
    const label = formatGalleryDayLabel(
      '2024-01-15',
      { today: 'Oggi', yesterday: 'Ieri' },
      'it'
    )
    expect(label.toLowerCase()).toContain('gennaio')
    expect(label).toContain('2024')
  })
})
