import { Platform } from 'react-native'

export const TAB_BAR_CLEARANCE = 56
export const SCREEN_PAD = 20
export const SCREEN_PAD_NARROW = 16

export function tabScrollBottomPad(safeBottom: number): number {
  if (Platform.OS === 'android') return 24
  return safeBottom + TAB_BAR_CLEARANCE
}

export function cameraBottomChrome(safeBottom: number): number {
  if (Platform.OS === 'android') return 16
  return safeBottom + 28
}
