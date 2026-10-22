import { Platform } from 'react-native'

import {
  CAMERA,
  cameraBottomChrome,
  cameraStampBottomClearance,
  TAB_BAR_CLEARANCE,
  tabScrollBottomPad,
} from '@/lib/layout'

describe('layout helpers', () => {
  const original = Platform.OS

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: original,
    })
  })

  it('uses fixed Android bottom padding', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    })
    expect(tabScrollBottomPad(34)).toBe(24)
    expect(cameraBottomChrome(34)).toBe(16)
  })

  it('adds tab clearance on iOS', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
    expect(tabScrollBottomPad(34)).toBe(34 + TAB_BAR_CLEARANCE)
    expect(cameraBottomChrome(34)).toBe(62)
  })

  it('stacks stamp clearance above camera chrome', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    })
    expect(cameraStampBottomClearance(34)).toBe(
      16 +
        CAMERA.chromePad +
        CAMERA.shutterRow +
        CAMERA.zoomBlockGap +
        CAMERA.zoomRowApprox
    )
  })
})
