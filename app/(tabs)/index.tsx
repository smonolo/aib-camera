import {
  CameraView,
  useMicrophonePermissions,
  type FlashMode,
} from 'expo-camera'
import * as Haptics from '@/lib/haptics'
import { Image } from 'expo-image'
import { useKeepAwake } from 'expo-keep-awake'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
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

import {
  AimChromeButton,
  AimModeControl,
  openAimTargetSheet,
} from '@/components/AimTargetControls'
import { AppIcon } from '@/components/AppIcon'
import { CameraChromeButton } from '@/components/CameraChromeButton'
import { PermissionGate } from '@/components/PermissionGate'
import { StampOverlay } from '@/components/StampOverlay'
import { useToast } from '@/components/Toast'
import {
  formatZoomChipLabel,
  formatZoomLabel,
  type ZoomOption,
} from '@/lib/camera-zoom'
import {
  finalizeCapture,
  finalizeVideoCapture,
  resolveCaptureGeo,
} from '@/lib/capture'
import { VIDEO_MAX_DURATION_SEC } from '@/lib/config'
import { errorMessage } from '@/lib/errors'
import { fonts } from '@/lib/fonts'
import { useI18n } from '@/lib/i18n/locale-context'
import { warn } from '@/lib/soft'
import { CAMERA, cameraBottomChrome, cameraLetterboxLayout } from '@/lib/layout'
import { capturePreviewUri } from '@/lib/media'
import { useStampSettings } from '@/lib/settings-context'
import {
  stampChromePad,
  stampLayoutMetrics,
  stampReferenceSize,
} from '@/lib/stamp'
import { getLatestCapture } from '@/lib/storage'
import { radii, useAppColorScheme, useAppColors } from '@/lib/theme'
import {
  cloneStampSettings,
  type CaptureRecord,
  type GeoSnapshot,
  type StampSettings,
} from '@/lib/types'
import { useCameraZoom } from '@/lib/use-camera-zoom'
import { createSerialQueue } from '@/lib/util'

type CaptureMode = 'picture' | 'video'

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
  const colors = useAppColors()
  const scheme = useAppColorScheme()
  const cameraRef = useRef<CameraView>(null)
  const { settings } = useStampSettings()
  const { showError } = useToast()
  const { copy, locale } = useI18n()
  const enqueue = useRef(createSerialQueue()).current
  const lightChrome = scheme === 'light'
  const [micPermission, requestMicPermission] = useMicrophonePermissions()

  const [flash, setFlash] = useState<FlashMode>('off')
  const [captureMode, setCaptureMode] = useState<CaptureMode>('picture')
  const [chromeMenu, setChromeMenu] = useState<'mode' | 'zoom' | null>(null)
  const [muteAudio, setMuteAudio] = useState(true)
  const [recording, setRecording] = useState(false)
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0)
  const [shutterBusy, setShutterBusy] = useState(false)
  const [pendingProcessing, setPendingProcessing] = useState(0)
  const shutterBusyRef = useRef(false)
  const recordingRef = useRef(false)
  const videoSnapRef = useRef<GeoSnapshot | null>(null)
  const videoSettingsRef = useRef<StampSettings | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [latestCapture, setLatestCapture] = useState<CaptureRecord | null>(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const shutterFlash = useSharedValue(0)
  const shutterFlashStyle = useAnimatedStyle(() => ({
    opacity: shutterFlash.value,
  }))
  const {
    zoom,
    selectedLens,
    selectedZoomKey,
    zoomOptions,
    pinchFactor,
    liveFactorShared,
    pinchStartFactor,
    applyZoomOption,
    beginPinchZoom,
    updatePinchZoom,
    endPinchZoom,
    resetZoomToDefault,
    refreshLenses,
    setAvailableLenses,
  } = useCameraZoom(cameraRef)

  const letterbox = useMemo(
    () =>
      cameraLetterboxLayout(viewport.width, viewport.height, {
        topSafe: insets.top,
        bottomSafe: insets.bottom,
        leftSafe: insets.left,
        rightSafe: insets.right,
      }),
    [
      viewport.width,
      viewport.height,
      insets.top,
      insets.bottom,
      insets.left,
      insets.right,
    ]
  )

  const chromePad = useMemo(() => {
    if (letterbox.previewWidth <= 0 || letterbox.previewHeight <= 0) {
      return CAMERA.framePad
    }
    return stampChromePad(
      stampLayoutMetrics(
        stampReferenceSize(letterbox.previewWidth, letterbox.previewHeight),
        settings
      )
    )
  }, [letterbox.previewWidth, letterbox.previewHeight, settings])

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

  const openPhotos = useCallback(() => {
    void Haptics.selectionAsync()
    router.push('/gallery')
  }, [])

  const openLatestPhoto = useCallback(() => {
    if (!latestCapture) return
    void Haptics.selectionAsync()
    router.push(`/photo/${latestCapture.id}`)
  }, [latestCapture])

  const toggleFlash = useCallback(() => {
    void Haptics.selectionAsync()
    setFlash(current => (current === 'off' ? 'on' : 'off'))
  }, [])

  const openStampSettings = useCallback(() => {
    void Haptics.selectionAsync()
    router.push('/configuration')
  }, [])

  const openAimTarget = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    openAimTargetSheet()
  }, [])

  const reportCaptureError = useCallback(
    (error: unknown, video = false) => {
      warn(video ? 'Video capture failed' : 'Capture failed', error)
      showError(
        video ? copy.camera.videoFailed : copy.camera.captureFailed,
        errorMessage(
          error,
          video ? copy.camera.videoFailedBody : copy.camera.captureFailedBody
        )
      )
    },
    [
      copy.camera.captureFailed,
      copy.camera.captureFailedBody,
      copy.camera.videoFailed,
      copy.camera.videoFailedBody,
      showError,
    ]
  )

  const ensureMicForVideo = useCallback(async (): Promise<boolean> => {
    if (micPermission?.granted) {
      setMuteAudio(false)
      return true
    }
    try {
      const result = await requestMicPermission()
      setMuteAudio(!result.granted)
      return result.granted
    } catch (error) {
      warn('Microphone permission request failed', error)
      setMuteAudio(true)
      return false
    }
  }, [micPermission?.granted, requestMicPermission])

  useEffect(() => {
    if (micPermission?.granted) setMuteAudio(false)
  }, [micPermission?.granted])

  const setMode = useCallback(
    (next: CaptureMode) => {
      setChromeMenu(null)
      if (recordingRef.current || next === captureMode) return
      void Haptics.selectionAsync()
      shutterBusyRef.current = false
      setShutterBusy(false)
      setCameraReady(false)
      setCaptureMode(next)
      if (next === 'video') {
        void ensureMicForVideo()
      }
    },
    [captureMode, ensureMicForVideo]
  )

  const toggleChromeMenu = useCallback((menu: 'mode' | 'zoom') => {
    if (recordingRef.current || shutterBusyRef.current) return
    void Haptics.selectionAsync()
    setChromeMenu(open => (open === menu ? null : menu))
  }, [])

  const selectZoomOption = useCallback(
    (option: ZoomOption) => {
      setChromeMenu(null)
      applyZoomOption(option)
    },
    [applyZoomOption]
  )

  useEffect(() => {
    if (recording) setChromeMenu(null)
  }, [recording])

  useEffect(() => {
    if (!recording) {
      setRecordingElapsedSec(0)
      return
    }
    setRecordingElapsedSec(0)
    const started = Date.now()
    const timer = setInterval(() => {
      setRecordingElapsedSec(
        Math.min(
          VIDEO_MAX_DURATION_SEC,
          Math.floor((Date.now() - started) / 1000)
        )
      )
    }, 250)
    return () => clearInterval(timer)
  }, [recording])

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

  const queueVideoCapture = useCallback(
    (videoUri: string, snap: GeoSnapshot, stampSettings: StampSettings) => {
      setPendingProcessing(count => count + 1)
      void enqueue(async () => {
        try {
          setLatestCapture(
            await finalizeVideoCapture(videoUri, snap, stampSettings)
          )
        } catch (error) {
          reportCaptureError(error, true)
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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

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

  const stopVideo = useCallback(() => {
    if (!recordingRef.current || !cameraRef.current) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      cameraRef.current.stopRecording()
    } catch (error) {
      reportCaptureError(error, true)
      recordingRef.current = false
      setRecording(false)
      shutterBusyRef.current = false
      setShutterBusy(false)
    }
  }, [reportCaptureError])

  const startVideo = useCallback(async () => {
    if (
      !cameraReady ||
      shutterBusyRef.current ||
      recordingRef.current ||
      !cameraRef.current
    ) {
      return
    }

    shutterBusyRef.current = true
    setShutterBusy(true)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      await ensureMicForVideo()
      const snap = await resolveCaptureGeo()
      const stampSettings = cloneStampSettings(settings)
      videoSnapRef.current = snap
      videoSettingsRef.current = stampSettings
      recordingRef.current = true
      setRecording(true)

      const video = await cameraRef.current.recordAsync({
        maxDuration: VIDEO_MAX_DURATION_SEC,
      })

      recordingRef.current = false
      setRecording(false)

      if (!video?.uri) throw new Error(copy.camera.videoFailed)

      queueVideoCapture(
        video.uri,
        videoSnapRef.current ?? snap,
        videoSettingsRef.current ?? stampSettings
      )
    } catch (error) {
      recordingRef.current = false
      setRecording(false)
      reportCaptureError(error, true)
    } finally {
      shutterBusyRef.current = false
      setShutterBusy(false)
      videoSnapRef.current = null
      videoSettingsRef.current = null
    }
  }, [
    cameraReady,
    copy.camera.videoFailed,
    ensureMicForVideo,
    queueVideoCapture,
    reportCaptureError,
    settings,
  ])

  const onShutterPress = useCallback(() => {
    if (captureMode === 'video') {
      if (recordingRef.current) stopVideo()
      else void startVideo()
      return
    }
    void takePhoto()
  }, [captureMode, startVideo, stopVideo, takePhoto])

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
        .enabled(cameraReady && !shutterBusy && !recording)
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
      recording,
      beginPinchZoom,
      updatePinchZoom,
      endPinchZoom,
      pinchStartFactor,
      liveFactorShared,
    ]
  )

  const onDoubleTapResetZoom = useCallback(() => {
    void Haptics.selectionAsync()
    resetZoomToDefault()
  }, [resetZoomToDefault])

  const doubleTapResetZoom = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(280)
        .onEnd(() => {
          runOnJS(onDoubleTapResetZoom)()
        }),
    [onDoubleTapResetZoom]
  )

  const longPressAim = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(450)
        .maxDistance(14)
        .onStart(() => {
          runOnJS(openAimTarget)()
        }),
    [openAimTarget]
  )

  const previewGestures = useMemo(
    () =>
      Gesture.Simultaneous(
        swipeToPhotos,
        pinchToZoom,
        doubleTapResetZoom,
        longPressAim
      ),
    [swipeToPhotos, pinchToZoom, doubleTapResetZoom, longPressAim]
  )

  const bottomPad = cameraBottomChrome(insets.bottom) + CAMERA.chromePad
  const flashOn = flash === 'on'
  const thumbTop = (CAMERA.shutterRow - CAMERA.thumbSize) / 2
  const showThumb = latestCapture != null || pendingProcessing > 0
  const previewReady = letterbox.previewHeight > 0
  const flashButton = (
    <CameraChromeButton
      onPress={toggleFlash}
      accessibilityLabel={flashOn ? copy.camera.flashOn : copy.camera.flashOff}
      name={flashOn ? 'flash' : 'flashOff'}
      color={flashOn ? '#171717' : undefined}
      backgroundColor={flashOn ? '#FACC15' : undefined}
    />
  )

  const stampSettingsButton = (
    <CameraChromeButton
      onPress={openStampSettings}
      accessibilityLabel={copy.camera.stampSettings}
      name="sliders"
    />
  )

  const recentThumb = showThumb ? (
    <Pressable
      onPress={openLatestPhoto}
      disabled={!latestCapture}
      accessibilityLabel={
        pendingProcessing > 0 && !latestCapture
          ? captureMode === 'video'
            ? copy.camera.processingVideo
            : copy.camera.processingPhoto
          : copy.camera.recentPhoto
      }
      style={{
        width: CAMERA.thumbSize,
        height: CAMERA.thumbSize,
        borderRadius: CAMERA.thumbRadius,
        borderWidth: 1.5,
        borderColor: lightChrome ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.4)',
        backgroundColor: lightChrome ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.35)',
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
          <>
            <Image
              source={{ uri: capturePreviewUri(latestCapture) }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
            {latestCapture.kind === 'video' ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 4,
                  bottom: 4,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  borderRadius: radii.full,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.semibold,
                    fontSize: 9,
                    color: '#FAFAFA',
                  }}
                >
                  {copy.photos.videoBadge}
                </Text>
              </View>
            ) : null}
          </>
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
            <ActivityIndicator color={lightChrome ? colors.fg : '#FAFAFA'} />
          </View>
        ) : null}
      </View>
    </Pressable>
  ) : null

  const chromeMenuShell = {
    position: 'absolute' as const,
    right: 0,
    bottom: CAMERA.sideButton + 10,
    minWidth: 148,
    borderRadius: radii.md,
    overflow: 'hidden' as const,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: lightChrome ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
  }

  const chromeMenuRowStyle = (selected: boolean) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: selected
      ? lightChrome
        ? 'rgba(0,0,0,0.06)'
        : 'rgba(255,255,255,0.1)'
      : 'transparent',
  })

  const showZoomChrome = zoomOptions.length >= 2
  const useCommaZoom = locale === 'it'

  const zoomMenu =
    chromeMenu === 'zoom' ? (
      <View style={chromeMenuShell}>
        {zoomOptions.map(option => {
          const selected = option.key === selectedZoomKey
          const display = formatZoomLabel(option.factor, useCommaZoom, true)
          return (
            <Pressable
              key={option.key}
              onPress={() => selectZoomOption(option)}
              accessibilityRole="menuitem"
              accessibilityState={{ selected }}
              accessibilityLabel={`${copy.camera.zoom} ${display}`}
              style={chromeMenuRowStyle(selected)}
            >
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 14,
                  color: colors.fg,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {display}
              </Text>
            </Pressable>
          )
        })}
      </View>
    ) : null

  const modeMenu =
    chromeMenu === 'mode' ? (
      <View style={chromeMenuShell}>
        {(['picture', 'video'] as const).map(mode => {
          const selected = captureMode === mode
          const label =
            mode === 'picture' ? copy.camera.modePhoto : copy.camera.modeVideo
          return (
            <Pressable
              key={mode}
              onPress={() => setMode(mode)}
              accessibilityRole="menuitem"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              style={chromeMenuRowStyle(selected)}
            >
              <AppIcon
                name={mode === 'picture' ? 'camera' : 'videocamera'}
                size={18}
                color={colors.fg}
              />
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 14,
                  color: colors.fg,
                }}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    ) : null

  const zoomLevelLabel = (() => {
    const selected = zoomOptions.find(option => option.key === selectedZoomKey)
    if (!selected) return '1×'
    const label = formatZoomChipLabel(
      selected,
      selectedZoomKey,
      pinchFactor,
      useCommaZoom
    )
    return label.includes('×') ? label : `${label}×`
  })()

  const zoomButton = showZoomChrome ? (
    <View
      style={{
        width: CAMERA.sideButton,
        height: CAMERA.sideButton,
      }}
    >
      {zoomMenu}
      <CameraChromeButton
        onPress={() => toggleChromeMenu('zoom')}
        accessibilityLabel={`${copy.camera.zoom} ${zoomLevelLabel}`}
        label={zoomLevelLabel}
      />
    </View>
  ) : null

  const modeButton = (
    <View
      style={{
        width: CAMERA.sideButton,
        height: CAMERA.sideButton,
      }}
    >
      {modeMenu}
      <CameraChromeButton
        onPress={() => toggleChromeMenu('mode')}
        accessibilityLabel={copy.camera.modeToggle}
        name={captureMode === 'video' ? 'videocamera' : 'camera'}
      />
    </View>
  )

  const rightChromeStack = (vertical: boolean) => (
    <View
      pointerEvents="box-none"
      style={{
        zIndex: 21,
        flexDirection: vertical ? 'column' : 'row',
        alignItems: 'center',
        gap: CAMERA.chromeStackGap,
      }}
    >
      {zoomButton}
      {modeButton}
    </View>
  )

  const recordingLabel = `${String(Math.floor(recordingElapsedSec / 60)).padStart(2, '0')}:${String(recordingElapsedSec % 60).padStart(2, '0')}`

  const shutterButton = (
    <Pressable
      onPress={onShutterPress}
      disabled={!cameraReady || (shutterBusy && !recording)}
      accessibilityLabel={
        captureMode === 'video'
          ? recording
            ? copy.camera.shutterVideoStop
            : copy.camera.shutterVideoStart
          : copy.camera.shutter
      }
      style={{
        width: CAMERA.shutterOuter,
        height: CAMERA.shutterOuter,
        borderRadius: radii.full,
        borderWidth: 4,
        borderColor: lightChrome ? colors.fg : 'rgba(255,255,255,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: shutterBusy && !recording ? 0.7 : 1,
      }}
    >
      <View
        style={{
          width: recording ? CAMERA.shutterInner * 0.55 : CAMERA.shutterInner,
          height: recording ? CAMERA.shutterInner * 0.55 : CAMERA.shutterInner,
          borderRadius: recording
            ? 8
            : captureMode === 'video'
              ? radii.full
              : radii.full,
          backgroundColor:
            captureMode === 'video'
              ? '#E11D48'
              : lightChrome
                ? colors.fg
                : '#FFFFFF',
        }}
      />
    </Pressable>
  )

  const preview = (
    <GestureDetector gesture={previewGestures}>
      <View
        accessibilityHint={copy.aim.longPressHint}
        style={{
          width: letterbox.previewWidth,
          height: letterbox.previewHeight,
          overflow: 'hidden',
          backgroundColor: '#000000',
        }}
      >
        <CameraView
          key={captureMode}
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          flash={flash}
          zoom={zoom}
          mode={captureMode}
          mute={captureMode === 'video' && muteAudio}
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
          frameWidth={stampReferenceSize(
            letterbox.previewWidth,
            letterbox.previewHeight
          )}
        />

        {recording ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: chromePad,
              alignSelf: 'center',
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: radii.full,
                backgroundColor: 'rgba(0,0,0,0.55)',
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: radii.full,
                  backgroundColor: '#E11D48',
                }}
              />
              <Text
                accessibilityLabel={`${copy.camera.recording} ${recordingLabel}`}
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 13,
                  color: '#FFFFFF',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {recordingLabel}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </GestureDetector>
  )

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-inverse"
      onLayout={onViewportLayout}
    >
      {previewReady ? (
        <>
          {chromeMenu != null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.aim.close}
              onPress={() => setChromeMenu(null)}
              style={{
                position: 'absolute',
                zIndex: 20,
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              }}
            />
          ) : null}
          {letterbox.landscape ? (
            <>
              <View
                pointerEvents="none"
                style={{ height: letterbox.topBand, width: '100%' }}
              />

              <View
                style={{
                  flexDirection: 'row',
                  height: letterbox.previewHeight,
                  width: '100%',
                }}
              >
                <View
                  pointerEvents="box-none"
                  style={{
                    width: letterbox.leftBand,
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    paddingLeft: insets.left + CAMERA.landscapeRailPad,
                    paddingRight: CAMERA.landscapeRailPad,
                    paddingVertical: CAMERA.landscapeChromeGap,
                  }}
                >
                  <View
                    style={{
                      alignItems: 'center',
                      gap: CAMERA.landscapeChromeGap,
                    }}
                  >
                    {flashButton}
                    <AimModeControl />
                    <AimChromeButton />
                    {stampSettingsButton}
                  </View>
                </View>

                {preview}

                <View
                  pointerEvents="box-none"
                  style={{
                    width: letterbox.rightBand,
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    paddingLeft: CAMERA.landscapeRailPad,
                    paddingRight: insets.right + CAMERA.landscapeRailPad,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: CAMERA.landscapeChromeGap,
                      paddingVertical: CAMERA.landscapeChromeGap,
                    }}
                  >
                    {recentThumb}
                    {shutterButton}
                    {rightChromeStack(true)}
                  </View>
                </View>
              </View>

              <View
                pointerEvents="none"
                style={{
                  flex: 1,
                  minHeight: letterbox.bottomBand,
                }}
              />
            </>
          ) : (
            <>
              <View
                pointerEvents="box-none"
                style={{ height: letterbox.topBand, width: '100%' }}
              >
                <View
                  pointerEvents="box-none"
                  style={{
                    marginTop: insets.top + CAMERA.topChromePad,
                    width: letterbox.previewWidth,
                    height: CAMERA.sideButton,
                    alignSelf: 'center',
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      left: chromePad,
                      top: 0,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: CAMERA.sideGap,
                    }}
                  >
                    {flashButton}
                  </View>
                  <View
                    style={{
                      position: 'absolute',
                      right: chromePad,
                      top: 0,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: CAMERA.sideGap,
                    }}
                  >
                    <AimModeControl />
                    <AimChromeButton />
                    {stampSettingsButton}
                  </View>
                </View>
              </View>

              <View style={{ alignSelf: 'center' }}>{preview}</View>

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
                  {recentThumb ? (
                    <View
                      style={{
                        position: 'absolute',
                        left: CAMERA.thumbInset,
                        top: thumbTop,
                      }}
                    >
                      {recentThumb}
                    </View>
                  ) : null}

                  {shutterButton}

                  <View
                    pointerEvents="box-none"
                    style={{
                      position: 'absolute',
                      right: CAMERA.thumbInset,
                      bottom: (CAMERA.shutterRow - CAMERA.sideButton) / 2,
                    }}
                  >
                    {rightChromeStack(false)}
                  </View>
                </View>
              </View>
            </>
          )}
        </>
      ) : null}
    </View>
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
