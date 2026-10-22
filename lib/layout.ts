import { Platform } from 'react-native'

export const TAB_BAR_CLEARANCE = 56
export const SCREEN_PAD = 20
export const SCREEN_PAD_NARROW = 16

export const CAMERA = {
  shutterRow: 74,
  shutterOuter: 74,
  shutterInner: 60,
  sideButton: 44,
  sideIcon: 18,
  sideGap: 8,
  thumbSize: 52,
  thumbRadius: 10,
  thumbInset: 36,
  chromePad: 4,
  zoomBlockGap: 14,
  zoomRowApprox: 36,
} as const

export function tabScrollBottomPad(safeBottom: number): number {
  if (Platform.OS === 'android') return 24
  return safeBottom + TAB_BAR_CLEARANCE
}

export function cameraBottomChrome(safeBottom: number): number {
  if (Platform.OS === 'android') return 16
  return safeBottom + 28
}

export function cameraStampBottomClearance(safeBottom: number): number {
  return (
    cameraBottomChrome(safeBottom) +
    CAMERA.chromePad +
    CAMERA.shutterRow +
    CAMERA.zoomBlockGap +
    CAMERA.zoomRowApprox
  )
}
