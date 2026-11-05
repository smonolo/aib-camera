import { Platform } from 'react-native'

import {
  ACTION_BUTTON_MAX_WIDTH,
  actionButtonLayoutStyle,
  CAMERA,
  CAMERA_PREVIEW_ASPECT,
  CAMERA_PREVIEW_ASPECT_LANDSCAPE,
  cameraBottomBandMin,
  cameraBottomChrome,
  cameraControlsBlockHeight,
  cameraLandscapeBottomBandMin,
  cameraLandscapeLeftBandMin,
  cameraLandscapeRightBandMin,
  cameraLandscapeTopBandMin,
  cameraLetterboxLayout,
  cameraTopBandMin,
  GALLERY_COLUMNS,
  SCREEN_PAD,
  SCREEN_PAD_NARROW,
  screenEdgePad,
  TAB_BAR,
  TAB_BAR_CLEARANCE,
  tabBarBottomOffset,
  tabBarHorizontalPad,
  tabScrollBottomPad,
} from '@/lib/layout'

describe('layout helpers', () => {
  const originalOs = Platform.OS

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalOs,
    })
  })

  it('trims the iOS home-indicator inset under the floating tab bar', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    expect(tabBarBottomOffset(34)).toBe(34 - TAB_BAR.iosSafeInsetTrim)
    expect(tabBarBottomOffset(0)).toBe(TAB_BAR.minBottomGap)
    expect(tabScrollBottomPad(34)).toBe(
      34 - TAB_BAR.iosSafeInsetTrim + TAB_BAR_CLEARANCE
    )
    expect(cameraBottomChrome(34)).toBe(
      34 - TAB_BAR.iosSafeInsetTrim + TAB_BAR.height + TAB_BAR.controlsGap
    )
    expect(cameraBottomChrome(0)).toBe(
      TAB_BAR.minBottomGap + TAB_BAR.height + TAB_BAR.controlsGap
    )
  })

  it('keeps the full Android system nav inset under the floating tab bar', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    })
    expect(tabBarBottomOffset(48)).toBe(48)
    expect(tabBarBottomOffset(24)).toBe(24)
    expect(tabBarBottomOffset(0)).toBe(TAB_BAR.minBottomGap)
    expect(tabScrollBottomPad(48)).toBe(48 + TAB_BAR_CLEARANCE)
    expect(cameraBottomChrome(48)).toBe(
      48 + TAB_BAR.height + TAB_BAR.controlsGap
    )
  })

  it('keeps more bottom clearance for the tab bar in landscape', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    expect(tabBarBottomOffset(21, { landscape: true })).toBe(21)
    expect(tabBarBottomOffset(0, { landscape: true })).toBe(
      TAB_BAR.landscapeMinBottomGap
    )
    expect(tabBarBottomOffset(21, { landscape: true })).toBe(
      21 - TAB_BAR.landscapeSafeInsetTrim
    )
    expect(cameraBottomChrome(21, { landscape: true })).toBe(
      21 + TAB_BAR.height + TAB_BAR.controlsGap
    )
    expect(tabScrollBottomPad(21, { landscape: true })).toBe(
      21 + TAB_BAR_CLEARANCE
    )
  })

  it('pads the tab bar by the larger horizontal safe inset', () => {
    expect(tabBarHorizontalPad(44, 0)).toBe(44)
    expect(tabBarHorizontalPad(0, 44)).toBe(44)
    expect(tabBarHorizontalPad(0, 0)).toBe(SCREEN_PAD_NARROW)
    expect(tabBarHorizontalPad(0, 0, { landscape: true })).toBe(SCREEN_PAD)
  })

  it('pads screen edges by the larger of safe inset and base', () => {
    expect(screenEdgePad(0, SCREEN_PAD)).toBe(SCREEN_PAD)
    expect(screenEdgePad(44, SCREEN_PAD_NARROW)).toBe(44)
    expect(screenEdgePad(-4, SCREEN_PAD)).toBe(SCREEN_PAD)
  })

  it('stacks controls block height from shutter chrome only', () => {
    expect(cameraControlsBlockHeight()).toBe(
      CAMERA.shutterRow + CAMERA.chromePad
    )
  })

  it('grows the preview to fill space above the shutter on a tall viewport', () => {
    const topMin = cameraTopBandMin(47)
    const bottomMin = cameraBottomBandMin(34)
    const layout = cameraLetterboxLayout(390, 900, {
      topSafe: 47,
      bottomSafe: 34,
    })

    expect(layout.landscape).toBe(false)
    expect(layout.leftBand).toBe(0)
    expect(layout.rightBand).toBe(0)
    expect(layout.previewWidth).toBe(390)
    expect(layout.previewHeight).toBe(900 - topMin - bottomMin)
    expect(layout.previewHeight).toBeGreaterThan(390 / CAMERA_PREVIEW_ASPECT)
    expect(layout.topBand).toBe(topMin)
    expect(layout.bottomBand).toBe(bottomMin)
    expect(layout.topBand + layout.previewHeight + layout.bottomBand).toBe(900)
  })

  it('shrinks the preview when the viewport is too short for full-width 4:3', () => {
    const layout = cameraLetterboxLayout(390, 420, {
      topSafe: 47,
      bottomSafe: 0,
    })

    expect(layout.landscape).toBe(false)
    expect(layout.previewHeight).toBeLessThan(390 / CAMERA_PREVIEW_ASPECT)
    expect(layout.previewWidth / layout.previewHeight).toBeCloseTo(
      CAMERA_PREVIEW_ASPECT
    )
    expect(layout.previewWidth).toBeLessThan(390)
    expect(layout.bottomBand).toBeGreaterThanOrEqual(cameraBottomBandMin(0))
    expect(layout.topBand + layout.previewHeight + layout.bottomBand).toBe(420)
  })

  it('keeps a reserved gap under the preview instead of growing into controls', () => {
    const tight = cameraLetterboxLayout(390, 640, {
      topSafe: 47,
      bottomSafe: 0,
    })
    const tallerTop = cameraLetterboxLayout(390, 640, {
      topSafe: 47 + 24,
      bottomSafe: 0,
    })

    expect(tight.bottomBand).toBeGreaterThanOrEqual(cameraBottomBandMin(0))
    expect(tallerTop.bottomBand).toBeGreaterThanOrEqual(cameraBottomBandMin(0))
    expect(tallerTop.previewHeight).toBeLessThanOrEqual(tight.previewHeight)
  })

  it('returns zeros before the viewport is measured', () => {
    expect(
      cameraLetterboxLayout(0, 0, { topSafe: 47, bottomSafe: 34 })
    ).toEqual({
      landscape: false,
      topBand: 0,
      bottomBand: 0,
      leftBand: 0,
      rightBand: 0,
      previewWidth: 0,
      previewHeight: 0,
    })
  })

  it('treats square viewports as portrait', () => {
    const layout = cameraLetterboxLayout(400, 400, {
      topSafe: 20,
      bottomSafe: 0,
    })
    expect(layout.landscape).toBe(false)
    expect(layout.leftBand).toBe(0)
    expect(layout.rightBand).toBe(0)
  })

  it('reserves side rails and fills height on a wide viewport', () => {
    const leftMin = cameraLandscapeLeftBandMin(44)
    const rightMin = cameraLandscapeRightBandMin(0)
    const topMin = cameraLandscapeTopBandMin(0)
    const bottomMin = cameraLandscapeBottomBandMin(21)
    const layout = cameraLetterboxLayout(844, 390, {
      topSafe: 0,
      bottomSafe: 21,
      leftSafe: 44,
      rightSafe: 0,
    })

    expect(layout.landscape).toBe(true)
    expect(layout.leftBand).toBe(leftMin)
    expect(layout.rightBand).toBe(rightMin)
    expect(layout.topBand).toBe(topMin)
    expect(layout.bottomBand).toBe(bottomMin)
    expect(layout.leftBand + layout.previewWidth + layout.rightBand).toBe(844)
    expect(layout.topBand + layout.previewHeight + layout.bottomBand).toBe(390)
    expect(layout.previewWidth).toBeGreaterThan(layout.previewHeight)
    expect(layout.previewHeight).toBe(390 - topMin - bottomMin)
  })

  it('fills available height in landscape even when narrower than 4:3', () => {
    const layout = cameraLetterboxLayout(500, 390, {
      topSafe: 0,
      bottomSafe: 21,
      leftSafe: 44,
      rightSafe: 0,
    })
    const leftMin = cameraLandscapeLeftBandMin(44)
    const rightMin = cameraLandscapeRightBandMin(0)
    const topMin = cameraLandscapeTopBandMin(0)
    const bottomMin = cameraLandscapeBottomBandMin(21)
    const availableWidth = 500 - leftMin - rightMin
    const availableHeight = 390 - topMin - bottomMin

    expect(layout.landscape).toBe(true)
    expect(layout.previewWidth).toBe(availableWidth)
    expect(layout.previewHeight).toBe(availableHeight)
    expect(layout.previewHeight).toBeGreaterThan(250)
    expect(layout.previewWidth / layout.previewHeight).toBeLessThan(
      CAMERA_PREVIEW_ASPECT_LANDSCAPE
    )
  })

  it('mirrors landscape rails when the notch is on the right', () => {
    const layout = cameraLetterboxLayout(844, 390, {
      topSafe: 0,
      bottomSafe: 21,
      leftSafe: 0,
      rightSafe: 44,
    })

    expect(layout.landscape).toBe(true)
    expect(layout.leftBand).toBe(cameraLandscapeLeftBandMin(0))
    expect(layout.rightBand).toBe(cameraLandscapeRightBandMin(44))
    expect(layout.leftBand + layout.previewWidth + layout.rightBand).toBe(844)
  })

  it('keeps landscape bottom chrome to tab-bar clearance only', () => {
    expect(cameraLandscapeBottomBandMin(21)).toBe(
      tabBarBottomOffset(21, { landscape: true }) +
        TAB_BAR.height +
        CAMERA.landscapeBottomGap
    )
    expect(cameraLandscapeBottomBandMin(21)).toBeLessThan(
      cameraBottomChrome(21, { landscape: true })
    )
    expect(cameraLandscapeTopBandMin(0)).toBe(CAMERA.landscapeTopChromePad)
    expect(cameraLandscapeLeftBandMin(44)).toBe(
      44 + CAMERA.landscapeRailPad * 2 + CAMERA.sideButton
    )
    expect(cameraLandscapeRightBandMin(0)).toBe(
      CAMERA.landscapeRailPad * 2 + CAMERA.shutterOuter
    )
  })

  it('keeps the gallery on a five-column grid', () => {
    expect(GALLERY_COLUMNS).toBe(5)
  })

  it('keeps action buttons full-width in portrait and capped in landscape', () => {
    expect(actionButtonLayoutStyle(false)).toEqual({ width: '100%' })
    expect(actionButtonLayoutStyle(true)).toEqual({
      width: '100%',
      maxWidth: ACTION_BUTTON_MAX_WIDTH,
      alignSelf: 'center',
    })
  })
})
