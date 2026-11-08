import { File } from 'expo-file-system'
import { ImageFormat, Skia } from '@shopify/react-native-skia'
import * as VideoThumbnails from 'expo-video-thumbnails'

import { withTimeout } from './location'
import { capturesDirectory, persistJpegCopy } from './persist-photo'
import { softTry } from './soft'

async function posterFromVideoThumbnails(
  videoUri: string
): Promise<string | null> {
  const result = await withTimeout(
    VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 0,
      quality: 0.72,
    }),
    4000,
    'video-thumbnail-timeout'
  )
  if (!result?.uri) return null
  return persistJpegCopy(result.uri, 'aib-poster')
}

async function makeSkiaVideoPoster(): Promise<string> {
  const size = 512
  const surface = Skia.Surface.MakeOffscreen(size, size)
  if (!surface) {
    throw new Error('Video poster surface unavailable')
  }

  const canvas = surface.getCanvas()
  canvas.clear(Skia.Color('#111111'))

  const discPaint = Skia.Paint()
  discPaint.setColor(Skia.Color('rgba(255,255,255,0.22)'))
  canvas.drawCircle(size / 2, size / 2, size * 0.22, discPaint)

  const cx = size / 2 + size * 0.02
  const cy = size / 2
  const s = size * 0.12
  const play = Skia.Path.Polygon(
    [
      Skia.Point(cx - s * 0.55, cy - s),
      Skia.Point(cx - s * 0.55, cy + s),
      Skia.Point(cx + s * 0.85, cy),
    ],
    true
  )
  const playPaint = Skia.Paint()
  playPaint.setColor(Skia.Color('#FAFAFA'))
  canvas.drawPath(play, playPaint)

  const snapshot = surface.makeImageSnapshot()
  const encoded = snapshot.encodeToBytes(ImageFormat.JPEG, 88)
  if (!encoded?.length) {
    throw new Error('Video poster encode failed')
  }

  const outFile = new File(capturesDirectory(), `aib-poster-${Date.now()}.jpg`)
  outFile.create({ overwrite: true })
  await outFile.write(encoded)
  if (!outFile.exists) {
    throw new Error('Video poster write failed')
  }
  return outFile.uri
}

export async function extractVideoPoster(
  videoUri: string
): Promise<string | null> {
  const frame = await softTry(
    'Video frame poster failed',
    () => posterFromVideoThumbnails(videoUri),
    null
  )
  if (frame) return frame

  return softTry(
    'Video placeholder poster failed',
    () => makeSkiaVideoPoster(),
    null
  )
}
