import { compositeStampOntoPhoto } from './composite'
import { newCaptureId } from './config'
import { writeCaptureExif } from './exif'
import { captureGeoSnapshot } from './location'
import { saveToAibAlbum } from './media'
import { buildCustomStampLines, buildInfoStampLines } from './stamp'
import { recordCapture, setCaptureMediaAssetId } from './storage'
import type { CaptureRecord, GeoSnapshot, StampSettings } from './types'
import { getSharedGeoSnapshot } from './use-live-geo'

export async function resolveCaptureGeo(): Promise<GeoSnapshot> {
  const live = getSharedGeoSnapshot()
  const takenAt = new Date()

  if (live.lat != null && live.lon != null) {
    return { ...live, takenAt }
  }

  return captureGeoSnapshot({
    headingHint: live.heading,
    positionTimeoutMs: 1500,
  })
}

export async function finalizeCapture(
  photoUri: string,
  snap: GeoSnapshot,
  settings: StampSettings
): Promise<CaptureRecord> {
  const stampedUri = await compositeStampOntoPhoto(
    photoUri,
    {
      infoLines: buildInfoStampLines(snap, settings),
      customLines: buildCustomStampLines(settings),
    },
    settings
  )

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

  await Promise.all([
    writeCaptureExif(stampedUri, snap, {
      captureId,
      customLines: settings.customLines,
    }),
    recordCapture(record),
  ])

  void saveToAibAlbum(stampedUri)
    .then(assetId => setCaptureMediaAssetId(captureId, assetId))
    .catch(error => {
      console.warn(error)
    })

  return record
}
