import {
  compositeStampOntoPhoto,
  type CompositeStampOptions,
} from './composite'
import { newCaptureId } from './config'
import { writeCaptureExif } from './exif'
import { buildEffectiveGeoSnapshot, getGeoSourceState } from './geo-source'
import { captureGeoSnapshot, emptyGeoSnapshot } from './location'
import { saveToAibAlbum } from './media'
import { persistRawPhoto, persistRawVideo } from './persist-photo'
import { softVoid, warn } from './soft'
import { buildStampContent } from './stamp'
import { recordCapture, setCaptureMediaAssetId } from './storage'
import type { CaptureRecord, GeoSnapshot, StampSettings } from './types'
import { getSharedGeoSnapshot } from './use-live-geo'
import { stampVideoCapture } from './video-stamp'
import { getCachedWindSync } from './wind'

function withCachedWind(snap: GeoSnapshot): GeoSnapshot {
  if (snap.lat == null || snap.lon == null) {
    return { ...snap, wind: null }
  }
  return { ...snap, wind: getCachedWindSync(snap.lat, snap.lon) }
}

export async function resolveCaptureGeo(): Promise<GeoSnapshot> {
  try {
    const { mode, sticky } = getGeoSourceState()
    const takenAt = new Date()
    let live = { ...getSharedGeoSnapshot(), takenAt }

    if (
      (mode !== 'target' || sticky == null) &&
      (live.lat == null || live.lon == null)
    ) {
      live = {
        ...(await captureGeoSnapshot({
          headingHint: live.heading,
          positionTimeoutMs: 1500,
        })),
        takenAt,
      }
    }

    return withCachedWind(buildEffectiveGeoSnapshot(live, mode, sticky))
  } catch (error) {
    warn('Capture geo fallback', error)
    return emptyGeoSnapshot()
  }
}

async function stampOrPersistRaw(
  photoUri: string,
  snap: GeoSnapshot,
  settings: StampSettings,
  stampOptions?: CompositeStampOptions
): Promise<string> {
  try {
    return await compositeStampOntoPhoto(
      photoUri,
      buildStampContent(snap, settings),
      settings,
      stampOptions
    )
  } catch (error) {
    warn('Stamp composite failed; keeping unstamped photo', error)
    return persistRawPhoto(photoUri)
  }
}

function baseCaptureRecord(
  captureId: string,
  uri: string,
  snap: GeoSnapshot,
  settings: StampSettings
): Omit<CaptureRecord, 'kind' | 'durationMs' | 'posterUri'> {
  return {
    id: captureId,
    uri,
    mediaLibraryAssetId: null,
    takenAt: snap.takenAt.toISOString(),
    lat: snap.lat,
    lon: snap.lon,
    accuracy: snap.accuracy,
    altitude: snap.altitude,
    heading: snap.heading,
    address: snap.address,
    customText: settings.customLines,
    stampConfigSnapshot: settings,
  }
}

export async function finalizeCapture(
  photoUri: string,
  snap: GeoSnapshot,
  settings: StampSettings,
  stampOptions?: CompositeStampOptions
): Promise<CaptureRecord> {
  const stampedUri = await stampOrPersistRaw(
    photoUri,
    snap,
    settings,
    stampOptions
  )

  const captureId = newCaptureId()
  const record: CaptureRecord = {
    ...baseCaptureRecord(captureId, stampedUri, snap, settings),
    kind: 'photo',
    durationMs: null,
    posterUri: null,
  }

  await softVoid('EXIF step failed', () =>
    writeCaptureExif(stampedUri, snap, {
      captureId,
      customLines: settings.customLines,
    })
  )

  await softVoid('Capture log/gallery persist failed', () =>
    recordCapture(record)
  )

  void saveToAibAlbum(stampedUri)
    .then(assetId => setCaptureMediaAssetId(captureId, assetId))
    .catch(error => warn('Photos album save failed', error))

  return record
}

export async function finalizeVideoCapture(
  videoUri: string,
  snap: GeoSnapshot,
  settings: StampSettings,
  stampOptions?: CompositeStampOptions
): Promise<CaptureRecord> {
  const stamped = await stampVideoCapture(
    videoUri,
    snap,
    buildStampContent(snap, settings),
    settings,
    stampOptions
  )

  const persistedUri = stamped.stamped
    ? stamped.uri
    : await persistRawVideo(stamped.uri)

  const captureId = newCaptureId()
  const record: CaptureRecord = {
    ...baseCaptureRecord(captureId, persistedUri, snap, settings),
    kind: 'video',
    durationMs: stamped.durationMs || null,
    posterUri: stamped.posterUri,
  }

  await softVoid('Capture log/gallery persist failed', () =>
    recordCapture(record)
  )

  void saveToAibAlbum(persistedUri)
    .then(assetId => setCaptureMediaAssetId(captureId, assetId))
    .catch(error => warn('Photos album save failed', error))

  return record
}
