export const TAB_BAR = {
  height: 58,
  itemWidth: 84,
  padding: 4,
  minBottomGap: 4,
  safeInsetTrim: 14,
  contentGap: 10,
  controlsGap: 24,
  iconSize: 28,
} as const

export const TAB_BAR_CLEARANCE = TAB_BAR.height + TAB_BAR.contentGap
export const SCREEN_PAD = 20
export const SCREEN_PAD_NARROW = 16

export const CAMERA_PREVIEW_ASPECT = 3 / 4

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
} as const

export function tabBarBottomOffset(safeBottom: number): number {
  return Math.max(safeBottom - TAB_BAR.safeInsetTrim, TAB_BAR.minBottomGap)
}

export function tabScrollBottomPad(safeBottom: number): number {
  return tabBarBottomOffset(safeBottom) + TAB_BAR_CLEARANCE
}

export function cameraBottomChrome(safeBottom: number): number {
  return tabBarBottomOffset(safeBottom) + TAB_BAR.height + TAB_BAR.controlsGap
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
  topBand: number
  bottomBand: number
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

export function cameraLetterboxLayout(
  containerWidth: number,
  containerHeight: number,
  options: { topSafe: number; bottomSafe: number }
): CameraLetterboxLayout {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { topBand: 0, bottomBand: 0, previewWidth: 0, previewHeight: 0 }
  }

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

  return { topBand, bottomBand, previewWidth, previewHeight }
}
