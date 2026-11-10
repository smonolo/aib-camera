import {
  buildGallerySections,
  compareCapturesChronological,
  sortCapturesChronological,
  takenAtMs,
} from '@/lib/gallery'
import { DEFAULT_STAMP_SETTINGS, type CaptureRecord } from '@/lib/types'

function capture(
  id: string,
  takenAt: string,
  extras: Partial<CaptureRecord> = {}
): CaptureRecord {
  return {
    id,
    uri: `file://${id}.jpg`,
    mediaLibraryAssetId: null,
    takenAt,
    lat: null,
    lon: null,
    accuracy: null,
    altitude: null,
    heading: null,
    address: null,
    customText: [],
    stampConfigSnapshot: DEFAULT_STAMP_SETTINGS,
    kind: 'photo',
    durationMs: null,
    posterUri: null,
    ...extras,
  }
}

const copy = {
  photos: {
    today: 'Today',
    yesterday: 'Yesterday',
  },
} as const

describe('takenAtMs', () => {
  it('parses valid ISO times', () => {
    expect(takenAtMs('2024-07-15T14:30:45.000Z')).toBe(
      Date.parse('2024-07-15T14:30:45.000Z')
    )
  })

  it('treats invalid timestamps as zero', () => {
    expect(takenAtMs('')).toBe(0)
    expect(takenAtMs('not-a-date')).toBe(0)
  })
})

describe('compareCapturesChronological', () => {
  it('orders by takenAt ascending', () => {
    const earlier = capture('a', '2024-07-15T10:00:00.000Z')
    const later = capture('b', '2024-07-15T12:00:00.000Z')
    expect(compareCapturesChronological(earlier, later)).toBeLessThan(0)
    expect(compareCapturesChronological(later, earlier)).toBeGreaterThan(0)
  })

  it('breaks ties by id for stable ordering', () => {
    const a = capture('a', '2024-07-15T12:00:00.000Z')
    const b = capture('b', '2024-07-15T12:00:00.000Z')
    expect(compareCapturesChronological(a, b)).toBeLessThan(0)
    expect(compareCapturesChronological(b, a)).toBeGreaterThan(0)
  })
})

describe('sortCapturesChronological', () => {
  it('puts a video before later map saves', () => {
    const video = capture('video', '2024-07-15T10:00:00.000Z', {
      kind: 'video',
    })
    const map1 = capture('map-1', '2024-07-15T10:05:00.000Z')
    const map2 = capture('map-2', '2024-07-15T10:06:00.000Z')
    expect(
      sortCapturesChronological([map2, video, map1]).map(c => c.id)
    ).toEqual(['video', 'map-1', 'map-2'])
  })
})

describe('buildGallerySections', () => {
  it('keeps newest day first and oldest→newest within a day', () => {
    const olderDay = capture('old', '2024-07-14T18:00:00.000Z')
    const video = capture('video', '2024-07-15T10:00:00.000Z', {
      kind: 'video',
    })
    const map = capture('map', '2024-07-15T11:00:00.000Z')

    const sections = buildGallerySections([map, olderDay, video], copy, 'en', 3)

    expect(sections.map(section => section.dayKey)).toEqual([
      '2024-07-15',
      '2024-07-14',
    ])
    expect(sections[0]!.data[0]!.items.map(item => item.id)).toEqual([
      'video',
      'map',
    ])
    expect(sections[1]!.data[0]!.items.map(item => item.id)).toEqual(['old'])
  })

  it('chunks rows by column count', () => {
    const items = [
      capture('a', '2024-07-15T10:00:00.000Z'),
      capture('b', '2024-07-15T10:01:00.000Z'),
      capture('c', '2024-07-15T10:02:00.000Z'),
      capture('d', '2024-07-15T10:03:00.000Z'),
    ]
    const sections = buildGallerySections(items, copy, 'en', 3)
    expect(sections).toHaveLength(1)
    expect(sections[0]!.data).toHaveLength(2)
    expect(sections[0]!.data[0]!.items.map(item => item.id)).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(sections[0]!.data[1]!.items.map(item => item.id)).toEqual(['d'])
  })

  it('keeps captures with unusable takenAt under today’s section', () => {
    const sections = buildGallerySections(
      [capture('bad', 'not-a-date'), capture('ok', '2024-07-15T10:00:00.000Z')],
      copy,
      'en',
      3
    )
    const ids = sections.flatMap(section =>
      section.data.flatMap(row => row.items.map(item => item.id))
    )
    expect(ids).toEqual(expect.arrayContaining(['bad', 'ok']))
    expect(ids).toHaveLength(2)
  })

  it('falls back to one column when columns is invalid', () => {
    const sections = buildGallerySections(
      [
        capture('a', '2024-07-15T10:00:00.000Z'),
        capture('b', '2024-07-15T10:01:00.000Z'),
      ],
      copy,
      'en',
      0
    )
    expect(sections[0]!.data).toHaveLength(2)
  })
})
