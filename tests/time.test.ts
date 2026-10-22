import { formatExifDateTime, ROME_TZ } from '@/lib/time'

describe('formatExifDateTime', () => {
  it('formats a UTC instant in Europe/Rome as EXIF DateTime', () => {
    const date = new Date('2024-07-15T14:30:45.000Z')
    expect(formatExifDateTime(date, ROME_TZ)).toBe('2024:07:15 16:30:45')
  })

  it('formats GPS stamps in UTC', () => {
    const date = new Date('2024-07-15T14:30:45.000Z')
    expect(formatExifDateTime(date, 'UTC')).toBe('2024:07:15 14:30:45')
  })
})
