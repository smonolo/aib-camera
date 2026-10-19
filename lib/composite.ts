import { Directory, File, Paths } from 'expo-file-system'
import { FontWeight, ImageFormat, Skia } from '@shopify/react-native-skia'

import { t } from './i18n'
import { stampFontPx } from './stamp'
import type { StampPosition, StampSettings } from './types'

function resolveFont(size: number) {
  const mgr = Skia.FontMgr.System()
  const style = { weight: FontWeight.SemiBold }
  let typeface = mgr.matchFamilyStyle('Helvetica', style)
  if (!typeface) {
    typeface = mgr.matchFamilyStyle('sans-serif', style)
  }
  if (!typeface) {
    typeface = mgr.matchFamilyStyle('Roboto', style)
  }
  return Skia.Font(typeface, size)
}

function stampOriginY(
  position: StampPosition,
  height: number,
  blockHeight: number,
  padding: number
): number {
  if (position === 'top') return padding
  return height - padding - blockHeight
}

export async function compositeStampOntoPhoto(
  photoUri: string,
  lines: string[],
  settings: StampSettings
): Promise<string> {
  const data = await Skia.Data.fromURI(photoUri)
  const image = Skia.Image.MakeImageFromEncoded(data)
  if (!image) {
    throw new Error(t().composite.loadFailed)
  }

  const width = image.width()
  const height = image.height()
  const scale = Math.max(width / 1080, 1)
  const fontSize = Math.round(stampFontPx(settings) * scale * 1.85)
  const lineGap = Math.round(fontSize * 0.32)
  const edgePad = Math.round(28 * scale)
  const boxPadX = Math.round(22 * scale)
  const boxPadY = Math.round(18 * scale)
  const font = resolveFont(fontSize)

  const textHeight =
    lines.length * fontSize + Math.max(0, lines.length - 1) * lineGap
  const blockWidth = width - edgePad * 2
  const blockHeight = textHeight + boxPadY * 2
  const originX = edgePad
  const originY = stampOriginY(settings.position, height, blockHeight, edgePad)

  const surface = Skia.Surface.MakeOffscreen(width, height)
  if (!surface) {
    throw new Error(t().composite.surfaceFailed)
  }

  const canvas = surface.getCanvas()
  canvas.drawImage(image, 0, 0)

  const bgAlpha = Math.min(1, Math.max(0, settings.opacity))
  if (bgAlpha > 0) {
    const bgPaint = Skia.Paint()
    bgPaint.setColor(Skia.Color(`rgba(0,0,0,${bgAlpha})`))
    const rr = Skia.RRectXY(
      Skia.XYWHRect(originX, originY, blockWidth, blockHeight),
      Math.round(14 * scale),
      Math.round(14 * scale)
    )
    canvas.drawRRect(rr, bgPaint)
  }

  const textPaint = Skia.Paint()
  textPaint.setColor(Skia.Color('#FFFFFF'))

  const shadowPaint = Skia.Paint()
  shadowPaint.setColor(Skia.Color('rgba(0,0,0,0.85)'))

  lines.forEach((line, index) => {
    const y = originY + boxPadY + fontSize + index * (fontSize + lineGap)
    const x = originX + boxPadX
    if (bgAlpha < 0.55) {
      canvas.drawText(line, x + 1.5 * scale, y + 1.5 * scale, shadowPaint, font)
    }
    canvas.drawText(line, x, y, textPaint, font)
  })

  const snapshot = surface.makeImageSnapshot()
  const encoded = snapshot.encodeToBytes(ImageFormat.JPEG, 92)

  const capturesDir = new Directory(Paths.document, 'captures')
  if (!capturesDir.exists) {
    capturesDir.create({ intermediates: true, idempotent: true })
  }

  const filename = `aib-${Date.now()}.jpg`
  const outFile = new File(capturesDir, filename)
  outFile.create({ overwrite: true })
  outFile.write(encoded)

  return outFile.uri
}
