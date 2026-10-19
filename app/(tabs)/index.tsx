import { CameraView, type FlashMode } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/AppIcon'
import { CameraHud } from '@/components/CameraHud'
import { GlassSurface } from '@/components/GlassSurface'
import { PermissionGate } from '@/components/PermissionGate'
import { errorMessage, useToast } from '@/components/Toast'
import { compositeStampOntoPhoto } from '@/lib/composite'
import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { captureGeoSnapshot, watchPosition } from '@/lib/location'
import { useStampSettings } from '@/lib/settings-context'
import { buildStampLines } from '@/lib/stamp'
import type { GeoSnapshot } from '@/lib/types'

export default function CameraScreen() {
  return (
    <PermissionGate>
      <CameraExperience />
    </PermissionGate>
  )
}

function CameraExperience() {
  const insets = useSafeAreaInsets()
  const cameraRef = useRef<CameraView>(null)
  const { settings } = useStampSettings()
  const { showError } = useToast()
  const copy = t()
  const [flash, setFlash] = useState<FlashMode>('off')
  const [capturing, setCapturing] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [geo, setGeo] = useState<GeoSnapshot>({
    lat: null,
    lon: null,
    accuracy: null,
    address: null,
    takenAt: new Date(),
  })

  useFocusEffect(
    useCallback(() => {
      let sub: { remove: () => void } | null = null
      let active = true

      void (async () => {
        const snap = await captureGeoSnapshot()
        if (active) setGeo(snap)

        sub = await watchPosition(update => {
          if (!active) return
          setGeo(prev => ({
            ...prev,
            ...update,
            takenAt: new Date(),
          }))
        })
      })()

      const clock = setInterval(() => {
        setGeo(prev => ({ ...prev, takenAt: new Date() }))
      }, 1000)

      return () => {
        active = false
        sub?.remove()
        clearInterval(clock)
      }
    }, [])
  )

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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const snap = await captureGeoSnapshot()
      setGeo(snap)

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

      const lines = buildStampLines(snap, settings)
      const stampedUri = await compositeStampOntoPhoto(
        photo.uri,
        lines,
        settings
      )

      router.push({
        pathname: '/review',
        params: {
          uri: stampedUri,
          takenAt: snap.takenAt.toISOString(),
          lat: snap.lat != null ? String(snap.lat) : '',
          lon: snap.lon != null ? String(snap.lon) : '',
          accuracy: snap.accuracy != null ? String(snap.accuracy) : '',
          address: snap.address ?? '',
        },
      })
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

  const tabBarClearance = 44
  const bottomChrome = insets.bottom + tabBarClearance
  const flashOn = flash === 'on'

  return (
    <GestureDetector gesture={swipeToPhotos}>
      <View className="flex-1 bg-black">
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          flash={flash}
          mode="picture"
          onCameraReady={() => setCameraReady(true)}
        />

        <View
          pointerEvents="box-none"
          className="absolute left-0 right-0 top-0 flex-row items-start justify-between px-4"
          style={{ paddingTop: insets.top + 10 }}
        >
          <View
            style={{
              borderRadius: 999,
              overflow: 'hidden',
              backgroundColor: flashOn ? '#FACC15' : 'transparent',
            }}
          >
            {flashOn ? (
              <Pressable
                onPress={toggleFlash}
                className="h-11 flex-row items-center gap-2 px-3.5"
                accessibilityLabel={copy.camera.flashOn}
              >
                <AppIcon
                  sf="bolt.fill"
                  material="flash-on"
                  size={18}
                  color="#171717"
                />
                <Text
                  style={{
                    fontFamily: fonts.semibold,
                    color: '#171717',
                    fontSize: 13,
                  }}
                >
                  {copy.camera.flash}
                </Text>
              </Pressable>
            ) : (
              <GlassSurface interactive forceDark style={{ borderRadius: 999 }}>
                <Pressable
                  onPress={toggleFlash}
                  className="h-11 flex-row items-center gap-2 px-3.5"
                  accessibilityLabel={copy.camera.flashOff}
                >
                  <AppIcon
                    sf="bolt.slash.fill"
                    material="flash-off"
                    size={18}
                    color="#FAFAFA"
                  />
                  <Text
                    style={{
                      fontFamily: fonts.semibold,
                      color: '#FAFAFA',
                      fontSize: 13,
                    }}
                  >
                    {copy.camera.flash}
                  </Text>
                </Pressable>
              </GlassSurface>
            )}
          </View>

          <CameraHud geo={geo} />
        </View>

        <View
          className="absolute bottom-0 left-0 right-0 items-center"
          style={{ paddingBottom: bottomChrome + 4 }}
        >
          <Pressable
            onPress={takePhoto}
            disabled={!cameraReady || capturing}
            accessibilityLabel={copy.camera.shutter}
            style={{
              width: 74,
              height: 74,
              borderRadius: 37,
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
                borderRadius: 30,
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
