import {
  Album,
  Asset,
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import { Platform, Share } from 'react-native'

import { APP_NAME } from './config'
import { t } from './i18n'

const ALBUM_NAME = APP_NAME
const PHOTO_GRANULAR = ['photo'] as const

async function ensureMediaLibraryPermission(): Promise<boolean> {
  const current = await getPermissionsAsync(true, [...PHOTO_GRANULAR])
  if (current.granted) return true

  const requested = await requestPermissionsAsync(true, [...PHOTO_GRANULAR])
  return requested.granted
}

export async function saveToAibAlbum(uri: string): Promise<void> {
  const granted = await ensureMediaLibraryPermission()
  if (!granted) {
    throw new Error(t().media.permissionDenied)
  }

  try {
    const existing = await Album.get(ALBUM_NAME)
    if (existing) {
      await Asset.create(uri, existing)
      return
    }
  } catch {}

  const asset = await Asset.create(uri)
  await Album.create(ALBUM_NAME, [asset], false)
}

export async function sharePhoto(uri: string): Promise<void> {
  await sharePhotos([uri])
}

export async function sharePhotos(uris: string[]): Promise<void> {
  const copy = t()
  const unique = [...new Set(uris.filter(Boolean))]
  if (unique.length === 0) return

  if (unique.length === 1) {
    const uri = unique[0]!
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: copy.media.shareDialogTitle,
        UTI: 'public.jpeg',
      })
      return
    }

    await Share.share(
      Platform.OS === 'ios'
        ? { url: uri }
        : { message: uri, title: copy.media.shareTitle }
    )
    return
  }

  if (Platform.OS === 'ios') {
    await Share.share({ urls: unique } as never)
    return
  }

  for (const uri of unique) {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: copy.media.shareDialogTitle,
        UTI: 'public.jpeg',
      })
    } else {
      await Share.share({ message: uri, title: copy.media.shareTitle })
    }
  }
}
