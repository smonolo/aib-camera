import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'

import { getInstallId, resetInstallIdCache } from '@/lib/install-id'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
}))

describe('getInstallId', () => {
  beforeEach(async () => {
    resetInstallIdCache()
    await AsyncStorage.clear()
    ;(Crypto.randomUUID as jest.Mock).mockReset()
    ;(Crypto.randomUUID as jest.Mock)
      .mockReturnValueOnce('11111111-2222-4333-8444-555555555555')
      .mockReturnValueOnce('99999999-8888-4777-8666-555555555555')
  })

  it('creates and persists a UUID on first launch', async () => {
    const id = await getInstallId()
    expect(id).toBe('11111111-2222-4333-8444-555555555555')
    expect(await AsyncStorage.getItem('aib-camera.install-id.v1')).toBe(id)
    expect(Crypto.randomUUID).toHaveBeenCalledTimes(1)
  })

  it('reuses the same UUID across calls and reloads', async () => {
    const first = await getInstallId()
    const second = await getInstallId()
    expect(second).toBe(first)
    expect(Crypto.randomUUID).toHaveBeenCalledTimes(1)

    resetInstallIdCache()
    const third = await getInstallId()
    expect(third).toBe(first)
    expect(Crypto.randomUUID).toHaveBeenCalledTimes(1)
  })
})
