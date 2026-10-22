import { Platform } from 'react-native'

import {
  APP_NAME,
  appVersionLabel,
  newCaptureId,
  privacyPolicyUrl,
  userGuideUrl,
} from '@/lib/config'

jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '2.0.0',
    ios: { buildNumber: '12' },
    android: { versionCode: 7 },
    extra: {
      privacyPolicyUrl: 'https://example.test/privacy',
      userGuideUrl: 'https://example.test/guida',
    },
  },
  nativeAppVersion: '2.0.0',
  nativeBuildVersion: '12',
}))

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-1111-4222-8333-444444444444'),
}))

describe('config', () => {
  const original = Platform.OS

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: original,
    })
  })

  it('exposes the app name', () => {
    expect(APP_NAME).toBe('AIB Camera')
  })

  it('reads the privacy policy URL from expo config', () => {
    expect(privacyPolicyUrl()).toBe('https://example.test/privacy')
  })

  it('reads the user guide URL from expo config', () => {
    expect(userGuideUrl()).toBe('https://example.test/guida')
  })

  it('formats the iOS version label with build number', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
    expect(appVersionLabel()).toBe('2.0.0 (12)')
  })

  it('formats the Android version label with versionCode', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    })
    expect(appVersionLabel()).toBe('2.0.0 (7)')
  })

  it('creates capture UUIDs via expo-crypto', () => {
    expect(newCaptureId()).toBe('00000000-1111-4222-8333-444444444444')
  })
})
