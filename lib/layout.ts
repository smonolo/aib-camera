import { Platform } from 'react-native'

export const TAB_BAR = {
  height: 58,
  itemWidth: 84,
  padding: 4,
  minBottomGap: 4,
  landscapeMinBottomGap: 12,
  iosSafeInsetTrim: 14,
  landscapeSafeInsetTrim: 0,
  contentGap: 10,
  controlsGap: 24,
  iconSize: 28,
} as const

export const TAB_BAR_CLEARANCE = TAB_BAR.height + TAB_BAR.contentGap
export const SCREEN_PAD = 20
export const SCREEN_PAD_NARROW = 16
export const SCREEN_HEADER_TOP_GAP = 16
export const GALLERY_HEADER_HEIGHT = 44
export const GALLERY_COLUMNS = 5
export const GALLERY_HEADER_SIDE = 96
export const PHOTO_SHARE_MAX_WIDTH = 360

export const CAMERA_PREVIEW_ASPECT = 3 / 4
export const CAMERA_PREVIEW_ASPECT_LANDSCAPE = 4 / 3

export const CAMERA = {
  shutterRow: 74,
  shutterOuter: 74,
  shutterInner: 60,
  sideButton: 44,
  sideIcon: 18,
  sideGap: 8,
  thumbSize: 52,
  thumbRadius: 10,
  framePad: 28,
  thumbInset: 28,
  chromePad: 4,
  topChromePad: 8,
  previewChromeGap: 14,
  landscapeRailPad: 16,
  landscapeChromeGap: 16,
  landscapeTopChromePad: 12,
  landscapeBottomGap: 8,
} as const

export function tabBarBottomOffset(
  safeBottom: number,
  options?: { landscape?: boolean }
): number {
  const iosTrim = options?.landscape
    ? TAB_BAR.landscapeSafeInsetTrim
    : TAB_BAR.iosSafeInsetTrim
  const trim = Platform.OS === 'ios' ? iosTrim : 0
  const minGap = options?.landscape
    ? TAB_BAR.landscapeMinBottomGap
    : TAB_BAR.minBottomGap
  return Math.max(safeBottom - trim, minGap)
}

export function tabScrollBottomPad(
  safeBottom: number,
  options?: { landscape?: boolean }
): number {
  return tabBarBottomOffset(safeBottom, options) + TAB_BAR_CLEARANCE
}

export function tabBarHorizontalPad(
  safeLeft: number,
  safeRight: number,
  options?: { landscape?: boolean }
): number {
  const base = options?.landscape ? SCREEN_PAD : SCREEN_PAD_NARROW
  return Math.max(safeLeft, safeRight, base)
}

export function screenEdgePad(safeInset: number, base: number): number {
  return Math.max(0, safeInset, base)
}

export function cameraBottomChrome(
  safeBottom: number,
  options?: { landscape?: boolean }
): number {
  return (
    tabBarBottomOffset(safeBottom, options) +
    TAB_BAR.height +
    TAB_BAR.controlsGap
  )
}

export function cameraControlsBlockHeight(): number {
  return CAMERA.shutterRow + CAMERA.chromePad
}

export function cameraTopBandMin(topSafe: number): number {
  return (
    Math.max(0, topSafe) +
    CAMERA.topChromePad +
    CAMERA.sideButton +
    CAMERA.previewChromeGap
  )
}

export type CameraLetterboxLayout = {
  landscape: boolean
  topBand: number
  bottomBand: number
  leftBand: number
  rightBand: number
  previewWidth: number
  previewHeight: number
}

export function cameraBottomBandMin(bottomSafe: number): number {
  return (
    CAMERA.previewChromeGap +
    cameraControlsBlockHeight() +
    cameraBottomChrome(bottomSafe)
  )
}

export function cameraLandscapeLeftBandMin(leftSafe: number): number {
  return (
    Math.max(0, leftSafe) +
    CAMERA.landscapeRailPad +
    CAMERA.sideButton +
    CAMERA.landscapeRailPad
  )
}

export function cameraLandscapeRightBandMin(rightSafe: number): number {
  return (
    Math.max(0, rightSafe) +
    CAMERA.landscapeRailPad +
    CAMERA.shutterOuter +
    CAMERA.landscapeRailPad
  )
}

export function cameraLandscapeTopBandMin(topSafe: number): number {
  return Math.max(0, topSafe) + CAMERA.landscapeTopChromePad
}

export function cameraLandscapeBottomBandMin(bottomSafe: number): number {
  return (
    tabBarBottomOffset(bottomSafe, { landscape: true }) +
    TAB_BAR.height +
    CAMERA.landscapeBottomGap
  )
}

function emptyLetterbox(): CameraLetterboxLayout {
  return {
    landscape: false,
    topBand: 0,
    bottomBand: 0,
    leftBand: 0,
    rightBand: 0,
    previewWidth: 0,
    previewHeight: 0,
  }
}

function portraitLetterbox(
  containerWidth: number,
  containerHeight: number,
  options: { topSafe: number; bottomSafe: number }
): CameraLetterboxLayout {
  const topMin = cameraTopBandMin(options.topSafe)
  const bottomMin = cameraBottomBandMin(options.bottomSafe)
  const available = Math.max(0, containerHeight - topMin - bottomMin)
  const fullWidthFourThree = containerWidth / CAMERA_PREVIEW_ASPECT

  let previewWidth: number
  let previewHeight: number

  if (available >= fullWidthFourThree) {
    previewWidth = containerWidth
    previewHeight = available
  } else {
    previewHeight = available
    previewWidth = previewHeight * CAMERA_PREVIEW_ASPECT
  }

  const leftover = Math.max(0, containerHeight - previewHeight)
  const topBand = Math.min(topMin, leftover)
  const bottomBand = leftover - topBand

  return {
    landscape: false,
    topBand,
    bottomBand,
    leftBand: 0,
    rightBand: 0,
    previewWidth,
    previewHeight,
  }
}

function landscapeLetterbox(
  containerWidth: number,
  containerHeight: number,
  options: {
    topSafe: number
    bottomSafe: number
    leftSafe: number
    rightSafe: number
  }
): CameraLetterboxLayout {
  const topMin = cameraLandscapeTopBandMin(options.topSafe)
  const bottomMin = cameraLandscapeBottomBandMin(options.bottomSafe)
  const leftMin = cameraLandscapeLeftBandMin(options.leftSafe)
  const rightMin = cameraLandscapeRightBandMin(options.rightSafe)

  const previewWidth = Math.max(0, containerWidth - leftMin - rightMin)
  const previewHeight = Math.max(0, containerHeight - topMin - bottomMin)

  return {
    landscape: true,
    topBand: topMin,
    bottomBand: bottomMin,
    leftBand: leftMin,
    rightBand: rightMin,
    previewWidth,
    previewHeight,
  }
}

export function cameraLetterboxLayout(
  containerWidth: number,
  containerHeight: number,
  options: {
    topSafe: number
    bottomSafe: number
    leftSafe?: number
    rightSafe?: number
  }
): CameraLetterboxLayout {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return emptyLetterbox()
  }

  if (containerWidth > containerHeight) {
    return landscapeLetterbox(containerWidth, containerHeight, {
      topSafe: options.topSafe,
      bottomSafe: options.bottomSafe,
      leftSafe: options.leftSafe ?? 0,
      rightSafe: options.rightSafe ?? 0,
    })
  }

  return portraitLetterbox(containerWidth, containerHeight, {
    topSafe: options.topSafe,
    bottomSafe: options.bottomSafe,
  })
}
