import type { CameraView } from 'expo-camera'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { Platform } from 'react-native'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'

import {
  buildIosZoomOptions,
  currentAbsoluteFactor,
  defaultZoomOptions,
  factorFromPinchScale,
  pickDefaultOption,
  resolveAbsoluteFactor,
  type CameraLensInfo,
  type ZoomOption,
} from '@/lib/camera-zoom'
import { warn } from '@/lib/soft'

type CameraZoomApi = {
  zoom: number
  selectedLens: string | undefined
  selectedZoomKey: string | null
  zoomOptions: ZoomOption[]
  pinchFactor: number
  liveFactorShared: SharedValue<number>
  pinchStartFactor: SharedValue<number>
  applyZoomOption: (option: ZoomOption) => void
  applyResolvedZoom: (factor: number) => void
  beginPinchZoom: (startFactor: number) => void
  updatePinchZoom: (startFactor: number, scale: number) => void
  endPinchZoom: () => void
  resetZoomToDefault: () => void
  refreshLenses: () => Promise<void>
  setAvailableLenses: (lenses: CameraLensInfo[]) => void
}

export function useCameraZoom(
  cameraRef: RefObject<CameraView | null>
): CameraZoomApi {
  const [availableLenses, setAvailableLenses] = useState<CameraLensInfo[]>([])
  const [selectedLens, setSelectedLens] = useState<string | undefined>()
  const [zoom, setZoom] = useState(0)
  const [selectedZoomKey, setSelectedZoomKey] = useState<string | null>(null)
  const [pinching, setPinching] = useState(false)
  const [pinchFactor, setPinchFactor] = useState(1)
  const pinchFactorRef = useRef(1)
  const pinchingRef = useRef(false)
  const pinchStartFactor = useSharedValue(1)
  const liveFactorShared = useSharedValue(1)

  const zoomOptions = useMemo(() => {
    if (Platform.OS === 'ios') return buildIosZoomOptions(availableLenses)
    return defaultZoomOptions()
  }, [availableLenses])

  const applyZoomOption = useCallback((option: ZoomOption) => {
    setSelectedZoomKey(option.key)
    if (option.lens) setSelectedLens(option.lens)
    setZoom(option.zoom)
  }, [])

  const applyResolvedZoom = useCallback(
    (factor: number) => {
      const resolved = resolveAbsoluteFactor(zoomOptions, factor)
      if (!resolved) return

      pinchFactorRef.current = resolved.factor
      setPinchFactor(resolved.factor)
      setZoom(resolved.zoom)
      setSelectedZoomKey(resolved.option.key)
      if (resolved.option.lens) setSelectedLens(resolved.option.lens)
    },
    [zoomOptions]
  )

  useEffect(() => {
    const factor = currentAbsoluteFactor(zoomOptions, selectedZoomKey, zoom)
    liveFactorShared.value = factor
    if (!pinching) {
      pinchFactorRef.current = factor
      setPinchFactor(factor)
    }
  }, [zoomOptions, selectedZoomKey, zoom, pinching, liveFactorShared])

  const beginPinchZoom = useCallback((startFactor: number) => {
    pinchingRef.current = true
    pinchFactorRef.current = startFactor
    setPinchFactor(startFactor)
    setPinching(true)
  }, [])

  const updatePinchZoom = useCallback(
    (startFactor: number, scale: number) => {
      if (!pinchingRef.current) return
      const next = factorFromPinchScale(startFactor, scale)
      if (Math.abs(next - pinchFactorRef.current) < 0.02) return
      applyResolvedZoom(next)
    },
    [applyResolvedZoom]
  )

  const endPinchZoom = useCallback(() => {
    if (!pinchingRef.current) return
    pinchingRef.current = false
    applyResolvedZoom(pinchFactorRef.current)
    setPinching(false)
  }, [applyResolvedZoom])

  const resetZoomToDefault = useCallback(() => {
    applyResolvedZoom(1)
  }, [applyResolvedZoom])

  useEffect(() => {
    if (zoomOptions.length === 0) {
      setSelectedZoomKey(null)
      return
    }

    const stillValid = zoomOptions.some(
      option => option.key === selectedZoomKey
    )
    if (stillValid) return

    const fallback = pickDefaultOption(zoomOptions)
    if (fallback) applyZoomOption(fallback)
  }, [zoomOptions, selectedZoomKey, applyZoomOption])

  const refreshLenses = useCallback(async () => {
    if (Platform.OS !== 'ios' || !cameraRef.current) return
    try {
      setAvailableLenses(await cameraRef.current.getAvailableLensesAsync())
    } catch (error) {
      warn('Camera lenses unavailable', error)
    }
  }, [cameraRef])

  return {
    zoom,
    selectedLens,
    selectedZoomKey,
    zoomOptions,
    pinchFactor,
    liveFactorShared,
    pinchStartFactor,
    applyZoomOption,
    applyResolvedZoom,
    beginPinchZoom,
    updatePinchZoom,
    endPinchZoom,
    resetZoomToDefault,
    refreshLenses,
    setAvailableLenses,
  }
}
