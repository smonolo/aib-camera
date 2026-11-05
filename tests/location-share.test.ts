import { Platform, Share } from 'react-native'

import {
  buildLocationShareMessage,
  mapsGeoUrl,
  mapsHttpUrl,
  mapsOpenUrl,
  shareLocationText,
} from '@/lib/location-share'

const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({
  action: 'sharedAction',
  activityType: undefined,
})

beforeEach(() => {
  shareSpy.mockClear()
  shareSpy.mockResolvedValue({
    action: 'sharedAction',
    activityType: undefined,
  })
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('mapsHttpUrl', () => {
  it('builds an Apple Maps link on iOS', () => {
    Platform.OS = 'ios'
    expect(mapsHttpUrl(45.5, 9.2)).toBe(
      'https://maps.apple.com/?ll=45.5,9.2&q=45.5%2C9.2'
    )
  })

  it('builds a Google Maps link on Android', () => {
    Platform.OS = 'android'
    expect(mapsHttpUrl(45.5, 9.2)).toBe(
      'https://www.google.com/maps/search/?api=1&query=45.5%2C9.2'
    )
  })

  it('encodes negative southern / western coords', () => {
    Platform.OS = 'ios'
    expect(mapsHttpUrl(-33.8688, -151.2093)).toContain('-33.8688,-151.2093')
  })
})

describe('mapsGeoUrl', () => {
  it('builds an Android geo URI with query', () => {
    expect(mapsGeoUrl(45.5, 9.2)).toBe('geo:45.5,9.2?q=45.5,9.2')
  })
})

describe('mapsOpenUrl', () => {
  it('uses geo URLs on Android', () => {
    Platform.OS = 'android'
    expect(mapsOpenUrl(45.5, 9.2)).toBe(mapsGeoUrl(45.5, 9.2))
  })

  it('uses HTTP maps URLs on iOS', () => {
    Platform.OS = 'ios'
    expect(mapsOpenUrl(45.5, 9.2)).toBe(mapsHttpUrl(45.5, 9.2))
  })
})

describe('buildLocationShareMessage', () => {
  it('returns info text alone when coords are missing', () => {
    expect(buildLocationShareMessage('hello', null, null)).toBe('hello')
    expect(buildLocationShareMessage('hello', 45.5, null)).toBe('hello')
    expect(buildLocationShareMessage('hello', null, 9.2)).toBe('hello')
  })

  it('appends a maps link under the info text', () => {
    Platform.OS = 'ios'
    expect(buildLocationShareMessage('hello', 45.5, 9.2)).toBe(
      `hello\n\n${mapsHttpUrl(45.5, 9.2)}`
    )
  })

  it('returns only the maps link when info text is blank', () => {
    Platform.OS = 'android'
    expect(buildLocationShareMessage('', 45.5, 9.2)).toBe(
      mapsHttpUrl(45.5, 9.2)
    )
    expect(buildLocationShareMessage('   ', 45.5, 9.2)).toBe(
      mapsHttpUrl(45.5, 9.2)
    )
  })
})

describe('shareLocationText', () => {
  it('opens the system share sheet', async () => {
    await shareLocationText('coords', 'Share location')
    expect(shareSpy).toHaveBeenCalledWith({
      message: 'coords',
      title: 'Share location',
    })
  })

  it('warns and rethrows when share fails', async () => {
    shareSpy.mockRejectedValueOnce(new Error('share boom'))
    await expect(shareLocationText('coords', 'Share location')).rejects.toThrow(
      'share boom'
    )
    expect(console.warn).toHaveBeenCalled()
  })
})
