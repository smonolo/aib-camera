import { CameraView, type FlashMode } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useKeepAwake } from 'expo-keep-awake'
import { router } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
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

import { AppIcon } from '@/components/AppIcon'
import { CameraHud } from '@/components/CameraHud'

import { PermissionGate } from '@/components/PermissionGate'
import { errorMessage, useToast } from '@/components/Toast'
import { ZoomControls } from '@/components/ZoomControls'
import {
  buildIosZoomOptions,
  defaultZoomOptions,
  pickDefaultOption,
  type ZoomOption,
} from '@/lib/camera-zoom'
import { compositeStampOntoPhoto } from '@/lib/composite'
import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { cameraBottomChrome } from '@/lib/layout'
import { captureGeoSnapshot } from '@/lib/location'
import { saveToAibAlbum } from '@/lib/media'
import { useStampSettings } from '@/lib/settings-context'
import { buildCustomStampLines, buildInfoStampLines } from '@/lib/stamp'
import { addCapture } from '@/lib/storage'
import { cameraOverlay, radii } from '@/lib/theme'
import { getSharedGeoSnapshot } from '@/lib/use-live-geo'
import type { GeoSnapshot } from '@/lib/types'

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
  const [flash, setFlash] = useState<FlashMode>('off')
  const [capturing, setCapturing] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [availableLenses, setAvailableLenses] = useState<string[]>([])
  const [selectedLens, setSelectedLens] = useState<string | undefined>()
  const [zoom, setZoom] = useState(0)
  const [selectedZoomKey, setSelectedZoomKey] = useState<string | null>(null)
  const shutterFlash = useSharedValue(0)
  const shutterFlashStyle = useAnimatedStyle(() => ({
    opacity: shutterFlash.value,
  }))

  const playShutterFlash = useCallback(() => {
    shutterFlash.value = 0
    shutterFlash.value = withSequence(
      withTiming(1, { duration: 35 }),
      withTiming(0, { duration: 220 })
    )
  }, [shutterFlash])

  const zoomOptions = useMemo(() => {
    if (Platform.OS === 'ios') {
      return buildIosZoomOptions(availableLenses)
    }
    return defaultZoomOptions()
  }, [availableLenses])

  const applyZoomOption = useCallback((option: ZoomOption) => {
    setSelectedZoomKey(option.key)
    if (option.lens) setSelectedLens(option.lens)
    setZoom(option.zoom)
  }, [])

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
      const lenses = await cameraRef.current.getAvailableLensesAsync()
      setAvailableLenses(lenses)
    } catch {}
  }, [])

  const openPhotos = useCallback(() => {
    void Haptics.selectionAsync()
    router.push('/gallery')
  }, [])

  const swipeToPhotos = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-40, 40])
        .onEnd(event => {
          if (event.translationX < -80) {
            runOnJS(openPhotos)()
          }
        }),
    [openPhotos]
  )

  const toggleFlash = async () => {
    await Haptics.selectionAsync()
    setFlash(current => (current === 'off' ? 'on' : 'off'))
  }

  const takePhoto = async () => {
    if (!cameraRef.current || !cameraReady || capturing) return

    setCapturing(true)
    playShutterFlash()
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const snap = await resolveCaptureGeo()

      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        exif: true,
        shutterSound: true,
        additionalExif:
          snap.lat != null && snap.lon != null
            ? {
                GPSLatitude: snap.lat,
                GPSLongitude: snap.lon,
              }
            : undefined,
      })

      if (!photo?.uri) {
        throw new Error(copy.camera.captureFailed)
      }

      const infoLines = buildInfoStampLines(snap, settings)
      const customLines = buildCustomStampLines(settings)

      await new Promise<void>(resolve => {
        requestIdleCallback(() => resolve(), { timeout: 500 })
      })

      const stampedUri = await compositeStampOntoPhoto(
        photo.uri,
        { infoLines, customLines },
        settings
      )

      await addCapture({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        uri: stampedUri,
        takenAt: snap.takenAt.toISOString(),
        lat: snap.lat,
        lon: snap.lon,
        accuracy: snap.accuracy,
        altitude: snap.altitude,
        heading: snap.heading,
        address: snap.address,
        customText: settings.customLines,
        stampConfigSnapshot: settings,
      })

      void saveToAibAlbum(stampedUri).catch(error => {
        console.warn(error)
      })

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error(error)
      showError(
        copy.camera.captureFailed,
        errorMessage(error, copy.camera.captureFailedBody)
      )
    } finally {
      setCapturing(false)
    }
  }

  const bottomChrome = cameraBottomChrome(insets.bottom)
  const flashOn = flash === 'on'
  const flashFg = flashOn ? '#171717' : '#FAFAFA'

  return (
    <GestureDetector gesture={swipeToPhotos}>
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

        <View
          pointerEvents="box-none"
          className="absolute left-0 right-0 top-0 flex-row items-start justify-between px-4"
          style={{ paddingTop: insets.top + 10 }}
        >
          <Pressable
            onPress={toggleFlash}
            accessibilityLabel={
              flashOn ? copy.camera.flashOn : copy.camera.flashOff
            }
            style={{
              height: 40,
              borderRadius: radii.full,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: flashOn ? '#FACC15' : cameraOverlay.fill,
            }}
          >
            <AppIcon
              sf={flashOn ? 'bolt.fill' : 'bolt.slash.fill'}
              material={flashOn ? 'flash-on' : 'flash-off'}
              size={18}
              color={flashFg}
            />
            <Text
              style={{
                fontFamily: fonts.semibold,
                color: flashFg,
                fontSize: 13,
              }}
            >
              {copy.camera.flash}
            </Text>
          </Pressable>

          <CameraHud />
        </View>

        <View
          pointerEvents="box-none"
          className="absolute bottom-0 left-0 right-0 items-center"
          style={{ paddingBottom: bottomChrome + 4 }}
        >
          <ZoomControls
            options={zoomOptions}
            selectedKey={selectedZoomKey}
            onSelect={applyZoomOption}
            accessibilityPrefix={copy.camera.zoom}
          />

          <Pressable
            onPress={takePhoto}
            disabled={!cameraReady || capturing}
            accessibilityLabel={copy.camera.shutter}
            style={{
              width: 74,
              height: 74,
              borderRadius: radii.full,
              borderWidth: 4,
              borderColor: 'rgba(255,255,255,0.85)',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: radii.full,
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {capturing ? <ActivityIndicator color="#171717" /> : null}
            </View>
          </Pressable>
        </View>
      </View>
    </GestureDetector>
  )
}

async function resolveCaptureGeo(): Promise<GeoSnapshot> {
  const live = getSharedGeoSnapshot()
  const takenAt = new Date()

  if (live.lat != null && live.lon != null) {
    return { ...live, takenAt }
  }

  return captureGeoSnapshot({
    headingHint: live.heading,
    positionTimeoutMs: 1500,
  })
}
