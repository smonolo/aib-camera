import * as Clipboard from 'expo-clipboard'

import { copyText } from '@/lib/clipboard'

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}))

describe('copyText', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns true when clipboard write succeeds', async () => {
    ;(Clipboard.setStringAsync as jest.Mock).mockResolvedValue(undefined)
    await expect(copyText('hello')).resolves.toBe(true)
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('hello')
  })

  it('returns false and warns when clipboard write fails', async () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    ;(Clipboard.setStringAsync as jest.Mock).mockRejectedValue(
      new Error('denied')
    )
    await expect(copyText('hello')).resolves.toBe(false)
    expect(spy).toHaveBeenCalled()
  })
})
