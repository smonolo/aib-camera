import { Directory, File, Paths } from 'expo-file-system'
import {
  FontWeight,
  ImageFormat,
  Skia,
  type SkCanvas,
  type SkFont,
  type SkPaint,
} from '@shopify/react-native-skia'

import { t } from './i18n'
import { stampLayoutMetrics, wrapTextToWidth } from './stamp'
import type { StampSettings } from './types'

type StampBurnInContent = {
  infoLines: string[]
  customLines: string[]
}

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

function drawStampBox({
  canvas,
  font,
  lines,
  originX,
  originY,
  blockWidth,
  boxPadX,
  boxPadY,
  fontSize,
  lineGap,
  scale,
  bgAlpha,
  textPaint,
  shadowPaint,
}: {
  canvas: SkCanvas
  font: SkFont
  lines: string[]
  originX: number
  originY: number
  blockWidth: number
  boxPadX: number
  boxPadY: number
  fontSize: number
  lineGap: number
  scale: number
  bgAlpha: number
  textPaint: SkPaint
  shadowPaint: SkPaint
}): number {
  if (lines.length === 0) return 0

  const textMaxWidth = Math.max(1, blockWidth - boxPadX * 2)
  const measure = (value: string) => font.measureText(value).width
  const wrappedLines = lines.flatMap(line =>
    wrapTextToWidth(line, textMaxWidth, measure)
  )

  const textHeight =
    wrappedLines.length * fontSize +
    Math.max(0, wrappedLines.length - 1) * lineGap
  const blockHeight = textHeight + boxPadY * 2

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

  wrappedLines.forEach((line, index) => {
    const y = originY + boxPadY + fontSize + index * (fontSize + lineGap)
    const x = originX + boxPadX
    if (bgAlpha < 0.55) {
      canvas.drawText(line, x + 1.5 * scale, y + 1.5 * scale, shadowPaint, font)
    }
    canvas.drawText(line, x, y, textPaint, font)
  })

  return blockHeight
}

export async function compositeStampOntoPhoto(
  photoUri: string,
  content: StampBurnInContent,
  settings: StampSettings
): Promise<string> {
  const data = await Skia.Data.fromURI(photoUri)
  const image = Skia.Image.MakeImageFromEncoded(data)
  if (!image) {
    throw new Error(t().composite.loadFailed)
  }

  const width = image.width()
  const height = image.height()
  const { scale, fontSize, lineGap, edgePad, boxPadX, boxPadY, bgAlpha } =
    stampLayoutMetrics(width, settings, { minScale: 1 })
  const font = resolveFont(fontSize)
  const blockWidth = width - edgePad * 2

  const surface = Skia.Surface.MakeOffscreen(width, height)
  if (!surface) {
    throw new Error(t().composite.surfaceFailed)
  }

  const canvas = surface.getCanvas()
  canvas.drawImage(image, 0, 0)

  const textPaint = Skia.Paint()
  textPaint.setColor(Skia.Color('#FFFFFF'))

  const shadowPaint = Skia.Paint()
  shadowPaint.setColor(Skia.Color('rgba(0,0,0,0.85)'))

  const boxArgs = {
    canvas,
    font,
    originX: edgePad,
    blockWidth,
    boxPadX,
    boxPadY,
    fontSize,
    lineGap,
    scale,
    bgAlpha,
    textPaint,
    shadowPaint,
  }

  drawStampBox({
    ...boxArgs,
    lines: content.infoLines,
    originY: edgePad,
  })

  if (content.customLines.length > 0) {
    const textMaxWidth = Math.max(1, blockWidth - boxPadX * 2)
    const measure = (value: string) => font.measureText(value).width
    const wrappedCustom = content.customLines.flatMap(line =>
      wrapTextToWidth(line, textMaxWidth, measure)
    )
    const customTextHeight =
      wrappedCustom.length * fontSize +
      Math.max(0, wrappedCustom.length - 1) * lineGap
    const customBlockHeight = customTextHeight + boxPadY * 2

    drawStampBox({
      ...boxArgs,
      lines: content.customLines,
      originY: height - edgePad - customBlockHeight,
    })
  }

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
