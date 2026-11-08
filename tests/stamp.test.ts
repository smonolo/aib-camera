import { setLocale, resetLocaleForTests } from '@/lib/i18n'
import {
  buildCustomStampLines,
  buildInfoStampLines,
  buildLocationInfoLines,
  buildLocationInfoText,
  buildStampContent,
  formatGalleryDayLabel,
  formatCoordinates,
  formatLatLon,
  formatStampCoordinates,
  formatStampDateTime,
  formatStampDms,
  formatWindStamp,
  galleryDayKey,
  parseCustomLines,
  stampChromePad,
  stampFontPx,
  stampLayoutMetrics,
  stampReferenceSize,
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

  it('formats full Italian datetime with weekday and month name', () => {
    const full = formatStampDateTime(takenAt, 'it-full')
    expect(full.toLowerCase()).toMatch(/luglio|july/)
    expect(full).toContain('2024')
    expect(full).toMatch(/16:30:45/)
  })
})

describe('formatStampCoordinates', () => {
  it('labels northern / eastern hemispheres', () => {
    expect(formatStampCoordinates(45.4642, 9.19)).toBe(
      '45.464200° N, 9.190000° E'
    )
  })

  it('labels southern / western hemispheres with absolute degrees', () => {
    expect(formatStampCoordinates(-33.8688, -151.2093)).toBe(
      '33.868800° S, 151.209300° W'
    )
  })
})

describe('formatStampDms', () => {
  it('formats degrees minutes seconds with hemispheres', () => {
    expect(formatStampDms(45.4642, 9.19)).toBe('45°27′51″ N, 9°11′24″ E')
    expect(formatStampDms(-33.8688, -151.2093)).toBe(
      '33°52′08″ S, 151°12′33″ W'
    )
  })
})

describe('formatCoordinates', () => {
  it('selects hemisphere, decimal, or dms', () => {
    expect(formatCoordinates(45.4642, 9.19, 'hemisphere')).toBe(
      '45.464200° N, 9.190000° E'
    )
    expect(formatCoordinates(45.4642, 9.19, 'decimal')).toBe(
      '45.464200, 9.190000'
    )
    expect(formatCoordinates(45.4642, 9.19, 'dms')).toBe(
      '45°27′51″ N, 9°11′24″ E'
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
      showWind: false,
      showAddress: false,
    })
    expect(lines).toEqual([])
  })

  it('includes wind on the meta line when enabled', () => {
    const lines = buildInfoStampLines(
      geo({
        wind: {
          speedKmh: 12.4,
          directionDeg: 225,
          fetchedAt: Date.now(),
          lat: 45.4642,
          lon: 9.19,
        },
      }),
      {
        ...DEFAULT_STAMP_SETTINGS,
        showDateTime: false,
        showCoordinates: false,
        showAccuracy: false,
        showAltitude: false,
        showHeading: false,
        showAddress: false,
      }
    )
    expect(lines).toEqual(['12 km/h SW'])
  })

  it('omits wind when the toggle is off', () => {
    const lines = buildInfoStampLines(
      geo({
        wind: {
          speedKmh: 12,
          directionDeg: 90,
          fetchedAt: Date.now(),
          lat: 45.4642,
          lon: 9.19,
        },
      }),
      {
        ...DEFAULT_STAMP_SETTINGS,
        showDateTime: false,
        showCoordinates: false,
        showAccuracy: false,
        showAltitude: false,
        showHeading: false,
        showWind: false,
        showAddress: false,
      }
    )
    expect(lines).toEqual([])
  })
})

describe('formatWindStamp', () => {
  it('formats speed and cardinal only', () => {
    expect(
      formatWindStamp({
        speedKmh: 12.4,
        directionDeg: 225,
        fetchedAt: 0,
        lat: 0,
        lon: 0,
      })
    ).toBe('12 km/h SW')
  })
})

describe('buildInfoStampLines aimed', () => {
  it('labels aimed targets and shows distance in meta', () => {
    const lines = buildInfoStampLines(
      geo({
        isAimedTarget: true,
        targetDistanceM: 200,
        accuracy: null,
        altitude: null,
      }),
      DEFAULT_STAMP_SETTINGS
    )
    expect(lines).toContain('Punto mirato (stimato)')
    expect(lines.some(line => line.includes('~200 m'))).toBe(true)
    expect(lines.every(line => !line.includes('±'))).toBe(true)
  })

  it('places the aimed label before coordinates', () => {
    const lines = buildInfoStampLines(
      geo({
        isAimedTarget: true,
        targetDistanceM: 100,
        accuracy: null,
        altitude: null,
      }),
      {
        ...DEFAULT_STAMP_SETTINGS,
        showDateTime: false,
        showAccuracy: false,
        showAltitude: false,
        showHeading: false,
        showAddress: false,
      }
    )
    expect(lines[0]).toBe('Punto mirato (stimato)')
    expect(lines[1]).toContain('45.464200')
  })

  it('still labels aimed targets without a distance', () => {
    const lines = buildInfoStampLines(
      geo({
        isAimedTarget: true,
        targetDistanceM: null,
        accuracy: null,
        altitude: null,
        heading: null,
      }),
      {
        ...DEFAULT_STAMP_SETTINGS,
        showDateTime: false,
        showAddress: false,
      }
    )
    expect(lines[0]).toBe('Punto mirato (stimato)')
    expect(lines.every(line => !line.includes('~'))).toBe(true)
  })

  it('rounds coarse accuracy and maps heading cardinals', () => {
    const lines = buildInfoStampLines(
      geo({ accuracy: 12.4, heading: 359, altitude: 10.4 }),
      {
        ...DEFAULT_STAMP_SETTINGS,
        showDateTime: false,
        showCoordinates: false,
        showAddress: false,
      }
    )
    const meta = lines[0] ?? ''
    expect(meta).toContain('±12 m')
    expect(meta).toContain('10 m')
    expect(meta).not.toContain('s.l.m.')
    expect(meta).toMatch(/0° N|359°/)
  })

  it('uses English aimed copy when the UI locale is English', () => {
    setLocale('en')
    try {
      const lines = buildInfoStampLines(
        geo({
          isAimedTarget: true,
          targetDistanceM: null,
          accuracy: null,
          altitude: null,
          heading: null,
        }),
        {
          ...DEFAULT_STAMP_SETTINGS,
          showDateTime: false,
          showCoordinates: false,
          showAccuracy: false,
          showAltitude: false,
          showHeading: false,
          showAddress: false,
        }
      )
      expect(lines).toEqual(['Aimed target (estimated)'])
    } finally {
      resetLocaleForTests()
    }
  })

  it('wraps long unbroken address tokens', () => {
    const lines = buildInfoStampLines(
      geo({
        address:
          'SupercalifragilisticexpialidociousPlaceNameWithoutSpacesAndMoreChars',
      }),
      {
        ...DEFAULT_STAMP_SETTINGS,
        showDateTime: false,
        showCoordinates: false,
        showAccuracy: false,
        showAltitude: false,
        showHeading: false,
        showWind: false,
      }
    )
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join('')).toContain('Supercalifragilistic')
  })
})

describe('buildLocationInfoText', () => {
  it('keeps address on one line and uses the selected coordinate format', () => {
    const text = buildLocationInfoText(geo(), DEFAULT_STAMP_SETTINGS)
    expect(text).toContain('45.464200° N, 9.190000° E')
    expect(text).not.toContain('45.464200, 9.190000\n')
    expect(text).toContain('Milano, Lombardia')
    expect(text.split('\n').some(line => line === 'Milano, Lombardia')).toBe(
      true
    )

    const decimal = buildLocationInfoText(geo(), {
      ...DEFAULT_STAMP_SETTINGS,
      coordinateFormat: 'decimal',
    })
    expect(decimal).toContain('45.464200, 9.190000')
    expect(decimal).not.toContain('45.464200° N')
  })

  it('labels aimed targets for map copy/share', () => {
    const text = buildLocationInfoText(
      geo({ isAimedTarget: true, targetDistanceM: 250, accuracy: null }),
      DEFAULT_STAMP_SETTINGS
    )
    expect(text).toContain('Punto mirato (stimato)')
    expect(text).toContain('~250 m')
  })
})

describe('buildLocationInfoLines', () => {
  it('wraps long addresses onto at most two lines', () => {
    const long =
      'Via Roma 1 · Quartiere Centro Storico · Comune Di Esempio · Regione Lombardia · Italia'
    const lines = buildLocationInfoLines(geo({ address: long }), {
      ...DEFAULT_STAMP_SETTINGS,
      showDateTime: false,
      showCoordinates: false,
      showAccuracy: false,
      showAltitude: false,
      showHeading: false,
      showWind: false,
    })
    expect(lines.length).toBe(2)
    expect(lines.join(' ')).toContain('Via Roma 1')
  })

  it('can keep the address unwrapped for share text', () => {
    const long =
      'Via Roma 1 · Quartiere Centro Storico · Comune Di Esempio · Regione Lombardia · Italia'
    const lines = buildLocationInfoLines(
      geo({ address: long }),
      {
        ...DEFAULT_STAMP_SETTINGS,
        showDateTime: false,
        showCoordinates: false,
        showAccuracy: false,
        showAltitude: false,
        showHeading: false,
      },
      { wrapAddress: false }
    )
    expect(lines).toEqual([long])
  })

  it('shows coordinate fallbacks when GPS is missing', () => {
    const lines = buildLocationInfoLines(
      geo({ lat: null, lon: null, address: null }),
      {
        ...DEFAULT_STAMP_SETTINGS,
        showDateTime: false,
        showAccuracy: false,
        showAltitude: false,
        showHeading: false,
      }
    )
    expect(lines).toContain('Coordinate non disponibili')
    expect(lines).toContain('Luogo non disponibile')
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

  it('wraps oversized custom lines', () => {
    const long = 'A'.repeat(70)
    const lines = buildCustomStampLines({
      ...DEFAULT_STAMP_SETTINGS,
      customLines: [long],
    })
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join('')).toBe(long)
  })

  it('wraps multi-word custom lines that overflow the stamp width', () => {
    const lines = buildCustomStampLines({
      ...DEFAULT_STAMP_SETTINGS,
      customLines: [
        'Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu',
      ],
    })
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join(' ')).toContain('Alpha')
    expect(lines.join(' ')).toContain('Mu')
  })
})

describe('buildStampContent', () => {
  it('returns info and custom lines together', () => {
    const content = buildStampContent(geo({ isAimedTarget: true }), {
      ...DEFAULT_STAMP_SETTINGS,
      customLines: ['Squadra Nord'],
      showDateTime: false,
      showAccuracy: false,
      showAltitude: false,
      showHeading: false,
      showAddress: false,
    })
    expect(content.infoLines[0]).toBe('Punto mirato (stimato)')
    expect(content.customLines).toEqual(['Squadra Nord'])
  })
})

describe('stampFontPx', () => {
  it('maps font size tokens', () => {
    expect(stampFontPx({ ...DEFAULT_STAMP_SETTINGS, fontSize: 'small' })).toBe(
      20
    )
    expect(stampFontPx({ ...DEFAULT_STAMP_SETTINGS, fontSize: 'medium' })).toBe(
      24
    )
    expect(stampFontPx({ ...DEFAULT_STAMP_SETTINGS, fontSize: 'large' })).toBe(
      28
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

  it('returns the original string when maxWidth is non-positive', () => {
    expect(wrapTextToWidth('hello', 0, measure)).toEqual(['hello'])
    expect(wrapTextToWidth('hello', -5, measure)).toEqual(['hello'])
  })
})

describe('stampLayoutMetrics', () => {
  it('scales font and padding from the reference width', () => {
    const metrics = stampLayoutMetrics(1080, {
      ...DEFAULT_STAMP_SETTINGS,
      fontSize: 'medium',
      opacity: 0.5,
    })
    expect(metrics.scale).toBe(1)
    expect(metrics.fontSize).toBe(Math.round(24 * 1.85))
    expect(metrics.edgePad).toBe(28)
    expect(metrics.boxPadX).toBe(22)
    expect(metrics.bgAlpha).toBe(0.5)
  })

  it('clamps opacity into 0…1', () => {
    expect(
      stampLayoutMetrics(1080, {
        ...DEFAULT_STAMP_SETTINGS,
        opacity: -1 as never,
      }).bgAlpha
    ).toBe(0)
    expect(
      stampLayoutMetrics(1080, {
        ...DEFAULT_STAMP_SETTINGS,
        opacity: 2 as never,
      }).bgAlpha
    ).toBe(1)
  })

  it('exposes chrome pad as stamp content inset', () => {
    const metrics = stampLayoutMetrics(1080, DEFAULT_STAMP_SETTINGS)
    expect(stampChromePad(metrics)).toBe(metrics.edgePad + metrics.boxPadX)
  })

  it('honors minScale for burn-in on small images', () => {
    const metrics = stampLayoutMetrics(540, DEFAULT_STAMP_SETTINGS, {
      minScale: 1,
    })
    expect(metrics.scale).toBe(1)
  })

  it('uses the short side so landscape matches the live overlay', () => {
    expect(stampReferenceSize(4032, 3024)).toBe(3024)
    expect(stampReferenceSize(3024, 4032)).toBe(3024)
    expect(stampReferenceSize(1080, 1080)).toBe(1080)
    expect(stampReferenceSize(0, 800)).toBe(1)
    expect(stampReferenceSize(-10, 50)).toBe(1)

    const landscape = stampLayoutMetrics(
      stampReferenceSize(4032, 3024),
      DEFAULT_STAMP_SETTINGS,
      { minScale: 1 }
    )
    const fromWidth = stampLayoutMetrics(4032, DEFAULT_STAMP_SETTINGS, {
      minScale: 1,
    })
    expect(landscape.fontSize).toBeLessThan(fromWidth.fontSize)
    expect(landscape.edgePad).toBeLessThan(fromWidth.edgePad)

    const preview = stampLayoutMetrics(
      stampReferenceSize(640, 480),
      DEFAULT_STAMP_SETTINGS
    )
    const burnIn = stampLayoutMetrics(
      stampReferenceSize(4032, 3024),
      DEFAULT_STAMP_SETTINGS,
      { minScale: 1 }
    )
    expect(burnIn.scale / preview.scale).toBeCloseTo(3024 / 480, 5)
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
