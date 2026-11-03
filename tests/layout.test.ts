import {
  CAMERA,
  CAMERA_PREVIEW_ASPECT,
  cameraBottomBandMin,
  cameraBottomChrome,
  cameraControlsBlockHeight,
  cameraLetterboxLayout,
  cameraTopBandMin,
  TAB_BAR,
  TAB_BAR_CLEARANCE,
  tabBarBottomOffset,
  tabScrollBottomPad,
} from '@/lib/layout'

describe('layout helpers', () => {
  it('shares floating tab clearance on both platforms', () => {
    expect(tabBarBottomOffset(34)).toBe(34 - TAB_BAR.safeInsetTrim)
    expect(tabBarBottomOffset(0)).toBe(TAB_BAR.minBottomGap)
    expect(tabScrollBottomPad(34)).toBe(
      34 - TAB_BAR.safeInsetTrim + TAB_BAR_CLEARANCE
    )
    expect(cameraBottomChrome(34)).toBe(
      34 - TAB_BAR.safeInsetTrim + TAB_BAR.height + TAB_BAR.controlsGap
    )
    expect(cameraBottomChrome(0)).toBe(
      TAB_BAR.minBottomGap + TAB_BAR.height + TAB_BAR.controlsGap
    )
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
      topBand: 0,
      bottomBand: 0,
      previewWidth: 0,
      previewHeight: 0,
    })
  })
})
