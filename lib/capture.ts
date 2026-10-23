import { compositeStampOntoPhoto } from './composite'
import { newCaptureId } from './config'
import { writeCaptureExif } from './exif'
import { buildEffectiveGeoSnapshot, getGeoSourceState } from './geo-source'
import { captureGeoSnapshot, emptyGeoSnapshot } from './location'
import { saveToAibAlbum } from './media'
import { persistRawPhoto } from './persist-photo'
import { softVoid, warn } from './soft'
import { buildStampContent } from './stamp'
import { recordCapture, setCaptureMediaAssetId } from './storage'
import type { CaptureRecord, GeoSnapshot, StampSettings } from './types'
import { getSharedGeoSnapshot } from './use-live-geo'

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

    return buildEffectiveGeoSnapshot(live, mode, sticky)
  } catch (error) {
    warn('Capture geo fallback', error)
    return emptyGeoSnapshot()
  }
}

async function stampOrPersistRaw(
  photoUri: string,
  snap: GeoSnapshot,
  settings: StampSettings
): Promise<string> {
  try {
    return await compositeStampOntoPhoto(
      photoUri,
      buildStampContent(snap, settings),
      settings
    )
  } catch (error) {
    warn('Stamp composite failed; keeping unstamped photo', error)
    return persistRawPhoto(photoUri)
  }
}

export async function finalizeCapture(
  photoUri: string,
  snap: GeoSnapshot,
  settings: StampSettings
): Promise<CaptureRecord> {
  const stampedUri = await stampOrPersistRaw(photoUri, snap, settings)

  const captureId = newCaptureId()
  const record: CaptureRecord = {
    id: captureId,
    uri: stampedUri,
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
