import { CameraView, type FlashMode } from 'expo-camera'
import * as Haptics from '@/lib/haptics'
import { Image } from 'expo-image'
import { useKeepAwake } from 'expo-keep-awake'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CameraChromeButton } from '@/components/CameraChromeButton'
import { PermissionGate } from '@/components/PermissionGate'
import { StampOverlay } from '@/components/StampOverlay'
import { useToast } from '@/components/Toast'
import { ZoomControls } from '@/components/ZoomControls'
import {
  buildIosZoomOptions,
  currentAbsoluteFactor,
  defaultZoomOptions,
  factorFromPinchScale,
  pickDefaultOption,
  resolveAbsoluteFactor,
  type ZoomOption,
} from '@/lib/camera-zoom'
import { finalizeCapture, resolveCaptureGeo } from '@/lib/capture'
import { errorMessage } from '@/lib/errors'
import { t } from '@/lib/i18n'
import { warn } from '@/lib/soft'
import { CAMERA, cameraBottomChrome, cameraLetterboxLayout } from '@/lib/layout'
import { useStampSettings } from '@/lib/settings-context'
import { getLatestCapture } from '@/lib/storage'
import { cameraOverlay, radii } from '@/lib/theme'
import {
  cloneStampSettings,
  type CaptureRecord,
  type GeoSnapshot,
  type StampSettings,
} from '@/lib/types'
import { createSerialQueue } from '@/lib/util'

export default function CameraScreen() {
  return (
    <PermissionGate>
      <CameraExperience />
    </PermissionGate>
  )
}

function CameraExperience() {
  useKeepAwake()
  const insets = useSafeAreaInsets()
  const cameraRef = useRef<CameraView>(null)
  const { settings } = useStampSettings()
  const { showError } = useToast()
  const copy = t()
  const enqueue = useRef(createSerialQueue()).current

  const [flash, setFlash] = useState<FlashMode>('off')
  const [shutterBusy, setShutterBusy] = useState(false)
  const [pendingProcessing, setPendingProcessing] = useState(0)
  const shutterBusyRef = useRef(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [availableLenses, setAvailableLenses] = useState<string[]>([])
  const [selectedLens, setSelectedLens] = useState<string | undefined>()
  const [zoom, setZoom] = useState(0)
  const [selectedZoomKey, setSelectedZoomKey] = useState<string | null>(null)
  const [latestCapture, setLatestCapture] = useState<CaptureRecord | null>(null)
  const [pinching, setPinching] = useState(false)
  const [pinchFactor, setPinchFactor] = useState(1)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const pinchFactorRef = useRef(1)
  const pinchingRef = useRef(false)
  const shutterFlash = useSharedValue(0)
  const pinchStartFactor = useSharedValue(1)
  const liveFactorShared = useSharedValue(1)
  const shutterFlashStyle = useAnimatedStyle(() => ({
    opacity: shutterFlash.value,
  }))

  const letterbox = useMemo(
    () =>
      cameraLetterboxLayout(viewport.width, viewport.height, {
        topSafe: insets.top,
        bottomSafe: insets.bottom,
      }),
    [viewport.width, viewport.height, insets.top, insets.bottom]
  )

  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setViewport(current =>
      current.width === width && current.height === height
        ? current
        : { width, height }
    )
  }, [])

  const refreshLatestCapture = useCallback(async () => {
    setLatestCapture(await getLatestCapture())
  }, [])

  useFocusEffect(
    useCallback(() => {
      void refreshLatestCapture()
    }, [refreshLatestCapture])
  )

  const playShutterFlash = useCallback(() => {
    shutterFlash.value = 0
    shutterFlash.value = withSequence(
      withTiming(1, { duration: 35 }),
      withTiming(0, { duration: 220 })
    )
  }, [shutterFlash])

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
      applyResolvedZoom(factorFromPinchScale(startFactor, scale))
    },
    [applyResolvedZoom]
  )

  const endPinchZoom = useCallback(() => {
    if (!pinchingRef.current) return
    pinchingRef.current = false
    applyResolvedZoom(pinchFactorRef.current)
    setPinching(false)
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
    } catch {}
  }, [])

  const openPhotos = useCallback(() => {
    void Haptics.selectionAsync()
    router.push('/gallery')
  }, [])

  const openLatestPhoto = useCallback(() => {
    if (!latestCapture) return
    void Haptics.selectionAsync()
    router.push(`/photo/${latestCapture.id}`)
  }, [latestCapture])

  const toggleFlash = useCallback(async () => {
    await Haptics.selectionAsync()
    setFlash(current => (current === 'off' ? 'on' : 'off'))
  }, [])

  const openStampSettings = useCallback(() => {
    void Haptics.selectionAsync()
    router.push('/configuration')
  }, [])

  const reportCaptureError = useCallback(
    (error: unknown) => {
      console.error(error)
      showError(
        copy.camera.captureFailed,
        errorMessage(error, copy.camera.captureFailedBody)
      )
    },
    [copy.camera.captureFailed, copy.camera.captureFailedBody, showError]
  )

  const queueCapture = useCallback(
    (photoUri: string, snap: GeoSnapshot, stampSettings: StampSettings) => {
      setPendingProcessing(count => count + 1)
      void enqueue(async () => {
        try {
          setLatestCapture(await finalizeCapture(photoUri, snap, stampSettings))
        } catch (error) {
          reportCaptureError(error)
        } finally {
          setPendingProcessing(count => Math.max(0, count - 1))
        }
      })
    },
    [enqueue, reportCaptureError]
  )

  const takePhoto = useCallback(async () => {
    if (!cameraReady || shutterBusyRef.current || !cameraRef.current) return

    shutterBusyRef.current = true
    setShutterBusy(true)
    playShutterFlash()
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const snap = await resolveCaptureGeo()
      const stampSettings = cloneStampSettings(settings)
      const photo = await takePictureWithFallback(cameraRef.current)

      if (!photo?.uri) throw new Error(copy.camera.captureFailed)

      queueCapture(photo.uri, snap, stampSettings)
    } catch (error) {
      reportCaptureError(error)
    } finally {
      shutterBusyRef.current = false
      setShutterBusy(false)
    }
  }, [
    cameraReady,
    copy.camera.captureFailed,
    playShutterFlash,
    queueCapture,
    reportCaptureError,
    settings,
  ])

  const swipeToPhotos = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-40, 40])
        .onEnd(event => {
          if (event.translationX < -80) runOnJS(openPhotos)()
        }),
    [openPhotos]
  )

  const pinchToZoom = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(cameraReady && !shutterBusy)
        .onBegin(() => {
          pinchStartFactor.value = liveFactorShared.value
        })
        .onStart(() => {
          runOnJS(beginPinchZoom)(pinchStartFactor.value)
        })
        .onUpdate(event => {
          runOnJS(updatePinchZoom)(pinchStartFactor.value, event.scale)
        })
        .onFinalize(() => {
          runOnJS(endPinchZoom)()
        }),
    [
      cameraReady,
      shutterBusy,
      beginPinchZoom,
      updatePinchZoom,
      endPinchZoom,
      pinchStartFactor,
      liveFactorShared,
    ]
  )

  const resetZoomToDefault = useCallback(() => {
    void Haptics.selectionAsync()
    applyResolvedZoom(1)
  }, [applyResolvedZoom])

  const doubleTapResetZoom = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(280)
        .onEnd(() => {
          runOnJS(resetZoomToDefault)()
        }),
    [resetZoomToDefault]
  )

  const cameraGestures = useMemo(
    () => Gesture.Simultaneous(swipeToPhotos, pinchToZoom, doubleTapResetZoom),
    [swipeToPhotos, pinchToZoom, doubleTapResetZoom]
  )

  const bottomPad = cameraBottomChrome(insets.bottom) + CAMERA.chromePad
  const flashOn = flash === 'on'
  const thumbTop = (CAMERA.shutterRow - CAMERA.thumbSize) / 2
  const showThumb = latestCapture != null || pendingProcessing > 0
  const previewReady = letterbox.previewHeight > 0

  return (
    <GestureDetector gesture={cameraGestures}>
      <View className="flex-1 bg-black" onLayout={onViewportLayout}>
        {previewReady ? (
          <>
            <View
              pointerEvents="box-none"
              style={{ height: letterbox.topBand, width: '100%' }}
            >
              <CameraChromeButton
                onPress={toggleFlash}
                accessibilityLabel={
                  flashOn ? copy.camera.flashOn : copy.camera.flashOff
                }
                sf={flashOn ? 'bolt.fill' : 'bolt.slash.fill'}
                material={flashOn ? 'flash-on' : 'flash-off'}
                color={flashOn ? '#171717' : undefined}
                backgroundColor={flashOn ? '#FACC15' : undefined}
                style={{
                  top: insets.top + CAMERA.topChromePad,
                  left: CAMERA.thumbInset,
                }}
              />
              <CameraChromeButton
                onPress={openStampSettings}
                accessibilityLabel={copy.camera.stampSettings}
                sf="slider.horizontal.3"
                material="tune"
                style={{
                  top: insets.top + CAMERA.topChromePad,
                  right: CAMERA.thumbInset,
                }}
              />
            </View>

            <View
              style={{
                width: letterbox.previewWidth,
                height: letterbox.previewHeight,
                alignSelf: 'center',
                overflow: 'hidden',
                backgroundColor: '#000000',
              }}
            >
              <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing="back"
                flash={flash}
                zoom={zoom}
                mode="picture"
                selectedLens={Platform.OS === 'ios' ? selectedLens : undefined}
                onCameraReady={() => {
                  setCameraReady(true)
                  void refreshLenses()
                }}
                onAvailableLensesChanged={({ lenses }) => {
                  setAvailableLenses(lenses)
                }}
              />

              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    backgroundColor: '#FFFFFF',
                  },
                  shutterFlashStyle,
                ]}
              />

              <StampOverlay frameWidth={letterbox.previewWidth} />
            </View>

            <View
              pointerEvents="box-none"
              style={{
                flex: 1,
                minHeight: letterbox.bottomBand,
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingBottom: bottomPad,
              }}
            >
              <View
                style={{
                  width: '100%',
                  height: CAMERA.shutterRow,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showThumb ? (
                  <Pressable
                    onPress={openLatestPhoto}
                    disabled={!latestCapture}
                    accessibilityLabel={
                      pendingProcessing > 0 && !latestCapture
                        ? copy.camera.processingPhoto
                        : copy.camera.recentPhoto
                    }
                    style={{
                      position: 'absolute',
                      left: CAMERA.thumbInset,
                      top: thumbTop,
                      width: CAMERA.thumbSize,
                      height: CAMERA.thumbSize,
                      borderRadius: CAMERA.thumbRadius,
                      borderWidth: 1.5,
                      borderColor: cameraOverlay.stroke,
                      backgroundColor: 'rgba(0,0,0,0.35)',
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        borderRadius: CAMERA.thumbRadius - 1.5,
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {latestCapture ? (
                        <Image
                          source={{ uri: latestCapture.uri }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      ) : null}
                      {pendingProcessing > 0 ? (
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0,0,0,0.45)',
                          }}
                        >
                          <ActivityIndicator color="#FAFAFA" />
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={takePhoto}
                  disabled={!cameraReady || shutterBusy}
                  accessibilityLabel={copy.camera.shutter}
                  style={{
                    width: CAMERA.shutterOuter,
                    height: CAMERA.shutterOuter,
                    borderRadius: radii.full,
                    borderWidth: 4,
                    borderColor: 'rgba(255,255,255,0.85)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: shutterBusy ? 0.7 : 1,
                  }}
                >
                  <View
                    style={{
                      width: CAMERA.shutterInner,
                      height: CAMERA.shutterInner,
                      borderRadius: radii.full,
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </Pressable>

                <View
                  pointerEvents="box-none"
                  style={{
                    position: 'absolute',
                    right: CAMERA.thumbInset,
                    top: 0,
                    bottom: 0,
                    justifyContent: 'center',
                  }}
                >
                  <ZoomControls
                    options={zoomOptions}
                    selectedKey={selectedZoomKey}
                    liveFactor={pinchFactor}
                    onSelect={applyZoomOption}
                    accessibilityPrefix={copy.camera.zoom}
                  />
                </View>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </GestureDetector>
  )
}

async function takePictureWithFallback(camera: CameraView) {
  try {
    return await camera.takePictureAsync({
      quality: 1,
      shutterSound: true,
    })
  } catch (error) {
    warn('takePictureAsync quality=1 failed; retrying', error)
    return camera.takePictureAsync({
      quality: 0.85,
      shutterSound: false,
    })
  }
}
