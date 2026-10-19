import {
  Album,
  Asset,
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import { Platform, Share } from 'react-native'

import { t } from './i18n'

const ALBUM_NAME = 'AIB Camera'

export async function ensureMediaLibraryPermission(): Promise<boolean> {
  const current = await getPermissionsAsync()
  if (current.granted) return true

  const requested = await requestPermissionsAsync()
  return requested.granted
}

export async function saveToAibAlbum(uri: string): Promise<void> {
  const granted = await ensureMediaLibraryPermission()
  if (!granted) {
    throw new Error(t().media.permissionDenied)
  }

  const existing = await Album.get(ALBUM_NAME)
  if (existing) {
    await Asset.create(uri, existing)
    return
  }

  const asset = await Asset.create(uri)
  await Album.create(ALBUM_NAME, [asset], false)
}

export async function sharePhoto(uri: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/jpeg',
      dialogTitle: 'Condividi foto AIB',
      UTI: 'public.jpeg',
    })
    return
  }

  await Share.share(
    Platform.OS === 'ios' ? { url: uri } : { message: uri, title: 'AIB Camera' }
  )
}
