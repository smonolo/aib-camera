import { File } from 'expo-file-system'
import { TurboModuleRegistry } from 'react-native'

import {
  renderStampOverlayPng,
  type CompositeStampOptions,
  type StampBurnInContent,
} from './composite'
import { APP_NAME, appVersionLabel } from './config'
import { newCaptureOutputUri } from './persist-photo'
import { warn } from './soft'
import type { GeoSnapshot, StampSettings } from './types'
import { extractVideoPoster } from './video-poster'

export { VIDEO_MAX_DURATION_SEC } from '@/lib/config'

export type VideoStampResult = {
  uri: string
  durationMs: number
  posterUri: string | null
  stamped: boolean
}

type VideoPipelineModule = typeof import('react-native-video-pipeline')

let pipelineCache: VideoPipelineModule | null | undefined
let nitroAvailableOverride: boolean | null = null

const OVERLAY_MAX_EDGE = 1920

export function resetVideoStampForTests(): void {
  pipelineCache = undefined
  nitroAvailableOverride = null
}

export function setNitroModulesAvailableForTests(value: boolean | null): void {
  nitroAvailableOverride = value
  pipelineCache = undefined
}

function nitroModulesAvailable(): boolean {
  if (nitroAvailableOverride != null) return nitroAvailableOverride
  return TurboModuleRegistry.get('NitroModules') != null
}

async function loadVideoPipeline(): Promise<VideoPipelineModule | null> {
  if (pipelineCache !== undefined) return pipelineCache

  if (!nitroModulesAvailable()) {
    warn(
      'Video pipeline skipped: NitroModules native module missing — rebuild the native app (npx expo run:ios|android); JS reload is not enough'
    )
    pipelineCache = null
    return null
  }

  try {
    pipelineCache = await import('react-native-video-pipeline')
    return pipelineCache
  } catch (error) {
    warn('Video pipeline native module unavailable', error)
    pipelineCache = null
    return null
  }
}

function deleteQuietly(uri: string | null | undefined): void {
  if (!uri) return
  try {
    const file = new File(uri)
    if (file.exists) file.delete()
  } catch (error) {
    warn('Temp video file cleanup failed', error)
  }
}

function overlayRenderSize(
  width: number,
  height: number
): { width: number; height: number } {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const longest = Math.max(w, h)
  if (longest <= OVERLAY_MAX_EDGE) return { width: w, height: h }
  const scale = OVERLAY_MAX_EDGE / longest
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  }
}

export async function stampVideoCapture(
  videoUri: string,
  snap: GeoSnapshot,
  content: StampBurnInContent,
  settings: StampSettings,
  options?: CompositeStampOptions
): Promise<VideoStampResult> {
  const outPath = newCaptureOutputUri('mp4')
  let overlayUri: string | null = null
  let stampedUri: string | null = null
  let durationMs = 0
  const posterPromise = extractVideoPoster(videoUri)
  const pipeline = await loadVideoPipeline()

  if (!pipeline) {
    return {
      uri: videoUri,
      durationMs,
      posterUri: await posterPromise,
      stamped: false,
    }
  }

  const { Overlay, Video } = pipeline

  try {
    const info = await Video.info(videoUri)
    durationMs = Math.max(0, Math.round((info.durationSec || 0) * 1000))
    if (!(info.width > 0) || !(info.height > 0)) {
      throw new Error('Video info returned invalid dimensions')
    }

    const overlaySize = overlayRenderSize(info.width, info.height)
    overlayUri = await renderStampOverlayPng(
      overlaySize.width,
      overlaySize.height,
      content,
      settings,
      options
    )

    const overlayFile = new File(overlayUri)
    if (!overlayFile.exists) {
      throw new Error('Stamp overlay PNG was not written')
    }

    const metadata = {
      software: `${APP_NAME} ${appVersionLabel()}`,
      creationDate: snap.takenAt,
      description: content.infoLines.filter(Boolean).join(' · ') || undefined,
      custom: {} as Record<string, string>,
      ...(snap.lat != null && snap.lon != null
        ? {
            location: {
              latitude: snap.lat,
              longitude: snap.lon,
              ...(snap.altitude != null ? { altitude: snap.altitude } : {}),
            },
          }
        : {}),
    }

    stampedUri = outPath

    try {
      await Video.stamp(videoUri, {
        outPath,
        watermark: Overlay.Image({
          uri: overlayUri,
          anchor: 'tl',
          size: {
            width: { unit: 'ratio', value: 1 },
            height: { unit: 'ratio', value: 1 },
          },
        }),
        metadata,
      })
    } catch (imageStampError) {
      warn(
        'Video image watermark failed; trying text watermark',
        imageStampError
      )
      const text = [...content.infoLines, ...content.customLines]
        .map(line => line.trim())
        .filter(Boolean)
        .join('\n')
      if (!text) throw imageStampError
      deleteQuietly(stampedUri)
      stampedUri = newCaptureOutputUri('mp4')
      await Video.stamp(videoUri, {
        outPath: stampedUri,
        watermark: Overlay.Text({
          text,
          style: {
            fontSize: Math.max(
              28,
              Math.round(Math.min(info.width, info.height) * 0.035)
            ),
            color: '#FFFFFF',
            weight: 'bold',
            shadow: { color: '#000000', blur: 3, dx: 1.5, dy: 1.5 },
          },
          anchor: { x: 0.04, y: 0.04 },
        }),
        metadata,
      })
    }

    const stampedFile = new File(stampedUri)
    if (!stampedFile.exists) {
      throw new Error('Stamped video was not written')
    }

    const earlyPoster = await posterPromise
    const stampedPoster = await extractVideoPoster(stampedUri)
    return {
      uri: stampedUri,
      durationMs,
      posterUri: stampedPoster ?? earlyPoster,
      stamped: true,
    }
  } catch (error) {
    warn('Video stamp failed; keeping unstamped video', error)
    deleteQuietly(outPath)
    if (stampedUri && stampedUri !== outPath) deleteQuietly(stampedUri)
    return {
      uri: videoUri,
      durationMs,
      posterUri: (await posterPromise) ?? (await extractVideoPoster(videoUri)),
      stamped: false,
    }
  } finally {
    deleteQuietly(overlayUri)
  }
}
