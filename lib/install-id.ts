import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'

import { warn } from './soft'

const INSTALL_ID_KEY = 'aib-camera.install-id.v1'

let installIdCache: string | null = null

export function resetInstallIdCache(): void {
  installIdCache = null
}

export async function getInstallId(): Promise<string> {
  if (installIdCache) return installIdCache

  try {
    const existing = await AsyncStorage.getItem(INSTALL_ID_KEY)
    if (existing?.trim()) {
      installIdCache = existing.trim()
      return installIdCache
    }
  } catch (error) {
    warn('Install ID read failed', error)
  }

  const created = Crypto.randomUUID()
  installIdCache = created

  try {
    await AsyncStorage.setItem(INSTALL_ID_KEY, created)
  } catch (error) {
    warn('Install ID persist failed', error)
  }

  return created
}
