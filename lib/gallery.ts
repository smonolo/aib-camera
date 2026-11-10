import type { AppLocale } from '@/lib/i18n'
import { formatGalleryDayLabel, galleryDayKey } from '@/lib/stamp'
import type { CaptureRecord } from '@/lib/types'

type GalleryDayCopy = {
  photos: {
    today: string
    yesterday: string
  }
}

export type GalleryPhotoRow = {
  key: string
  items: CaptureRecord[]
}

export type GalleryPhotoSection = {
  title: string
  dayKey: string
  data: GalleryPhotoRow[]
}

export function takenAtMs(iso: string): number {
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : 0
}

export function compareCapturesChronological(
  a: Pick<CaptureRecord, 'id' | 'takenAt'>,
  b: Pick<CaptureRecord, 'id' | 'takenAt'>
): number {
  const delta = takenAtMs(a.takenAt) - takenAtMs(b.takenAt)
  if (delta !== 0) return delta
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

export function compareCapturesNewestFirst(
  a: Pick<CaptureRecord, 'id' | 'takenAt'>,
  b: Pick<CaptureRecord, 'id' | 'takenAt'>
): number {
  return compareCapturesChronological(b, a)
}

export function sortCapturesChronological(
  captures: CaptureRecord[]
): CaptureRecord[] {
  return [...captures].sort(compareCapturesChronological)
}

export function sortCapturesNewestFirst(
  captures: CaptureRecord[]
): CaptureRecord[] {
  return [...captures].sort(compareCapturesNewestFirst)
}

export function buildGallerySections(
  captures: CaptureRecord[],
  copy: GalleryDayCopy,
  locale: AppLocale,
  columns: number
): GalleryPhotoSection[] {
  const safeColumns = Math.max(1, Math.floor(columns) || 1)
  const groups = new Map<string, CaptureRecord[]>()

  const fallbackDayKey = galleryDayKey(new Date().toISOString())

  for (const capture of captures) {
    const rawKey = galleryDayKey(capture.takenAt)
    const key = !rawKey || rawKey === 'Invalid Date' ? fallbackDayKey : rawKey
    const list = groups.get(key)
    if (list) list.push(capture)
    else groups.set(key, [capture])
  }

  const dayKeys = [...groups.keys()].sort((a, b) => b.localeCompare(a))

  return dayKeys.map(dayKey => {
    const items = [...(groups.get(dayKey) ?? [])].sort(
      compareCapturesNewestFirst
    )
    return {
      dayKey,
      title: formatGalleryDayLabel(
        dayKey,
        { today: copy.photos.today, yesterday: copy.photos.yesterday },
        locale
      ),
      data: chunkGalleryRows(items, dayKey, safeColumns),
    }
  })
}

function chunkGalleryRows(
  items: CaptureRecord[],
  dayKey: string,
  columns: number
): GalleryPhotoRow[] {
  const rows: GalleryPhotoRow[] = []
  for (let i = 0; i < items.length; i += columns) {
    const slice = items.slice(i, i + columns)
    rows.push({
      key: `${dayKey}-${i}`,
      items: slice,
    })
  }
  return rows
}
