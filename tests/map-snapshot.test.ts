import { decodeDataUrlBase64 } from '@/lib/map-snapshot'

describe('decodeDataUrlBase64', () => {
  it('decodes a JPEG data URL', () => {
    const bytes = decodeDataUrlBase64('data:image/jpeg;base64,aGVsbG8=')
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111])
  })

  it('rejects invalid payloads', () => {
    expect(() => decodeDataUrlBase64('not-a-data-url')).toThrow(
      'Invalid image data URL'
    )
    expect(() => decodeDataUrlBase64('data:image/jpeg;base64,')).toThrow(
      'Invalid image data URL'
    )
  })
})
