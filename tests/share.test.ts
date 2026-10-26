import * as Sharing from 'expo-sharing'
import { Platform, Share } from 'react-native'

import { shareFile } from '@/lib/share'

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}))

const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({
  action: 'sharedAction',
  activityType: undefined,
})

const options = {
  mimeType: 'image/jpeg',
  dialogTitle: 'Share photo',
  uti: 'public.jpeg',
  title: 'Photo',
}

describe('shareFile', () => {
  const originalOs = Platform.OS

  beforeEach(() => {
    jest.clearAllMocks()
    shareSpy.mockResolvedValue({
      action: 'sharedAction',
      activityType: undefined,
    })
    ;(Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true)
    ;(Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined)
  })

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalOs,
    })
    shareSpy.mockRestore()
  })

  it('uses expo-sharing when available', async () => {
    await shareFile('file:///a.jpg', options)
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///a.jpg', {
      mimeType: 'image/jpeg',
      dialogTitle: 'Share photo',
      UTI: 'public.jpeg',
    })
    expect(shareSpy).not.toHaveBeenCalled()
  })

  it('falls back to Share on iOS when expo-sharing is unavailable', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
    ;(Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false)

    await shareFile('file:///a.jpg', options)

    expect(shareSpy).toHaveBeenCalledWith({
      url: 'file:///a.jpg',
      title: 'Photo',
    })
  })

  it('falls back to Share on Android when expo-sharing throws', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    })
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    ;(Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true)
    ;(Sharing.shareAsync as jest.Mock).mockRejectedValue(
      new Error('share boom')
    )

    await shareFile('file:///a.jpg', { ...options, title: undefined })

    expect(warnSpy).toHaveBeenCalled()
    expect(shareSpy).toHaveBeenCalledWith({
      message: 'file:///a.jpg',
      title: 'Share photo',
    })
    warnSpy.mockRestore()
  })
})
