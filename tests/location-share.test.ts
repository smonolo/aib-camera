import { Platform } from 'react-native'

import { mapsGeoUrl, mapsHttpUrl, mapsOpenUrl } from '@/lib/location-share'

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
