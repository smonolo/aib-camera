import { CameraView, type FlashMode } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { useKeepAwake } from 'expo-keep-awake'
import { router, useFocusEffect, type Href } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, View } from 'react-native'
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
import { ZoomPinchMeter } from '@/components/ZoomPinchMeter'
import {
  buildIosZoomOptions,
  currentAbsoluteFactor,
  defaultZoomOptions,
  pickDefaultOption,
  resolveAbsoluteFactor,
  type ZoomOption,
} from '@/lib/camera-zoom'
import { finalizeCapture, resolveCaptureGeo } from '@/lib/capture'
import { errorMessage } from '@/lib/errors'
import { t } from '@/lib/i18n'
import {
  CAMERA,
  cameraBottomChrome,
  cameraStampBottomClearance,
} from '@/lib/layout'
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
  const pinchFactorRef = useRef(1)
  const pinchingRef = useRef(false)
  const shutterFlash = useSharedValue(0)
  const pinchStartFactor = useSharedValue(1)
  const liveFactorShared = useSharedValue(1)
  const shutterFlashStyle = useAnimatedStyle(() => ({
    opacity: shutterFlash.value,
  }))

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
    (absoluteFactor: number) => {
      if (!pinchingRef.current) return
      applyResolvedZoom(absoluteFactor)
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
    router.push('/settings/appearance?from=camera' as Href)
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
    if (!cameraRef.current || !cameraReady || shutterBusyRef.current) return

    shutterBusyRef.current = true
    setShutterBusy(true)
    playShutterFlash()
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const snap = await resolveCaptureGeo()
      const stampSettings = cloneStampSettings(settings)
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        shutterSound: true,
      })

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
          runOnJS(beginPinchZoom)(pinchStartFactor.value)
        })
        .onUpdate(event => {
          runOnJS(updatePinchZoom)(pinchStartFactor.value * event.scale)
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

  const doubleTapFlash = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(280)
        .onEnd(() => {
          runOnJS(toggleFlash)()
        }),
    [toggleFlash]
  )

  const cameraGestures = useMemo(
    () => Gesture.Simultaneous(swipeToPhotos, pinchToZoom, doubleTapFlash),
    [swipeToPhotos, pinchToZoom, doubleTapFlash]
  )

  const bottomChrome = cameraBottomChrome(insets.bottom)
  const flashOn = flash === 'on'
  const thumbTop = (CAMERA.shutterRow - CAMERA.thumbSize) / 2
  const sideButtonTop = (CAMERA.shutterRow - CAMERA.sideButton) / 2
  const showThumb = latestCapture != null || pendingProcessing > 0

  return (
    <GestureDetector gesture={cameraGestures}>
      <View className="flex-1 bg-black">
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

        <StampOverlay
          bottomClearance={cameraStampBottomClearance(insets.bottom)}
        />

        <View
          pointerEvents="box-none"
          className="absolute bottom-0 left-0 right-0 items-center"
          style={{ paddingBottom: bottomChrome + CAMERA.chromePad }}
        >
          <View
            style={{ alignItems: 'center', marginBottom: CAMERA.zoomBlockGap }}
          >
            <ZoomPinchMeter
              options={zoomOptions}
              factor={pinchFactor}
              visible={pinching}
            />
            <ZoomControls
              options={zoomOptions}
              selectedKey={selectedZoomKey}
              onSelect={applyZoomOption}
              accessibilityPrefix={copy.camera.zoom}
            />
          </View>

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

            <CameraChromeButton
              onPress={toggleFlash}
              accessibilityLabel={
                flashOn ? copy.camera.flashOn : copy.camera.flashOff
              }
              sf={flashOn ? 'bolt.fill' : 'bolt.slash.fill'}
              material={flashOn ? 'flash-on' : 'flash-off'}
              color={flashOn ? '#171717' : '#FAFAFA'}
              backgroundColor={flashOn ? '#FACC15' : cameraOverlay.fill}
              style={{
                right: CAMERA.thumbInset + CAMERA.sideButton + CAMERA.sideGap,
                top: sideButtonTop,
              }}
            />

            <CameraChromeButton
              onPress={openStampSettings}
              accessibilityLabel={copy.camera.stampSettings}
              sf="gearshape.fill"
              material="settings"
              style={{
                right: CAMERA.thumbInset,
                top: sideButtonTop,
              }}
            />
          </View>
        </View>
      </View>
    </GestureDetector>
  )
}
