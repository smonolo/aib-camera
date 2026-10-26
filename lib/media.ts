import { File } from 'expo-file-system'
import {
  Album,
  Asset,
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-media-library'

import { APP_NAME } from './config'
import { t } from './i18n'
import { shareFile } from './share'
import { logRejected, softTry, warn } from './soft'
import { loadCaptures, removeCaptures } from './storage'
import type { CaptureRecord } from './types'
import { uniqueStrings } from './util'

const ALBUM_NAME = APP_NAME
export const PHOTO_GRANULAR = ['photo'] as const

async function ensureMediaLibraryPermission(
  writeOnly: boolean
): Promise<boolean> {
  return softTry(
    'Media library permission check failed',
    async () => {
      const current = await getPermissionsAsync(writeOnly, [...PHOTO_GRANULAR])
      if (current.granted) return true
      const requested = await requestPermissionsAsync(writeOnly, [
        ...PHOTO_GRANULAR,
      ])
      return requested.granted
    },
    false
  )
}

export async function saveToAibAlbum(uri: string): Promise<string> {
  const granted = await ensureMediaLibraryPermission(true)
  if (!granted) {
    throw new Error(t().media.permissionDenied)
  }

  try {
    const existing = await Album.get(ALBUM_NAME)
    if (existing) {
      const asset = await Asset.create(uri, existing)
      return asset.id
    }
  } catch {}

  const asset = await Asset.create(uri)
  await Album.create(ALBUM_NAME, [asset], false)
  return asset.id
}

export async function deleteMediaLibraryAssets(
  assetIds: Array<string | null | undefined>
): Promise<void> {
  const unique = uniqueStrings(assetIds)
  if (unique.length === 0) return

  const granted = await ensureMediaLibraryPermission(false)
  if (!granted) return

  try {
    await Asset.delete(unique.map(id => new Asset(id)))
  } catch (error) {
    warn('Media library delete failed', error)
  }
}

export async function deleteLocalPhotoFiles(
  uris: Array<string | null | undefined>
): Promise<void> {
  for (const uri of uniqueStrings(uris)) {
    try {
      const file = new File(uri)
      if (file.exists) file.delete()
    } catch (error) {
      warn('Local photo delete failed', error)
    }
  }
}

export async function deleteCaptures(ids: string[]): Promise<CaptureRecord[]> {
  if (ids.length === 0) return loadCaptures()

  const remove = new Set(ids)
  const existing = await loadCaptures()
  const doomed = existing.filter(item => remove.has(item.id))
  if (doomed.length === 0) return existing

  logRejected(
    'deleteCaptures step failed',
    await Promise.allSettled([
      deleteMediaLibraryAssets(doomed.map(item => item.mediaLibraryAssetId)),
      deleteLocalPhotoFiles(doomed.map(item => item.uri)),
      removeCaptures(ids),
    ])
  )

  return loadCaptures()
}

export async function sharePhotos(uris: string[]): Promise<void> {
  const copy = t()
  const unique = uniqueStrings(uris)
  if (unique.length === 0) return

  const jpegOptions = {
    mimeType: 'image/jpeg',
    dialogTitle: copy.media.shareDialogTitle,
    uti: 'public.jpeg',
    title: copy.media.shareTitle,
  }

  try {
    for (const uri of unique) {
      await shareFile(uri, jpegOptions)
    }
  } catch (error) {
    warn('sharePhotos failed', error)
    throw error
  }
}
