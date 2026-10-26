import * as WebBrowser from 'expo-web-browser'

import { openExternalUrl } from '@/lib/browser'

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}))

describe('openExternalUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns true when the browser opens', async () => {
    ;(WebBrowser.openBrowserAsync as jest.Mock).mockResolvedValue({
      type: 'dismiss',
    })
    await expect(openExternalUrl('https://example.test/guide')).resolves.toBe(
      true
    )
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      'https://example.test/guide'
    )
  })

  it('returns false when opening fails', async () => {
    ;(WebBrowser.openBrowserAsync as jest.Mock).mockRejectedValue(
      new Error('no browser')
    )
    await expect(openExternalUrl('https://example.test/guide')).resolves.toBe(
      false
    )
  })
})
