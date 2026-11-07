import * as Haptics from '@/lib/haptics'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { useCallback, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AimHeaderButton, AimModeControl } from '@/components/AimTargetControls'
import { Button } from '@/components/Button'
import { FieldMap, type FieldMapHandle } from '@/components/FieldMap'
import { IconButton } from '@/components/IconButton'
import { StampOverlay } from '@/components/StampOverlay'
import { useToast } from '@/components/Toast'
import { finalizeCapture } from '@/lib/capture'
import { copyText } from '@/lib/clipboard'
import { errorMessage } from '@/lib/errors'
import { fonts } from '@/lib/fonts'
import {
  moveAimedTarget,
  useEffectiveGeoSnapshot,
  useGeoSource,
} from '@/lib/geo-source'
import { useI18n } from '@/lib/i18n/locale-context'
import {
  SCREEN_HEADER_TOP_GAP,
  SCREEN_PAD,
  SCREEN_PAD_NARROW,
  screenEdgePad,
  tabScrollBottomPad,
} from '@/lib/layout'
import { mapsOpenUrl } from '@/lib/location-share'
import { useStampSettings } from '@/lib/settings-context'
import { softVoid } from '@/lib/soft'
import {
  buildLocationInfoText,
  MAP_STAMP_SAVE_APPEARANCE,
  MAP_STAMP_SCALE,
  mapStampLiveAppearance,
  stampReferenceSize,
} from '@/lib/stamp'
import { radii, useAppColorScheme, useAppColors } from '@/lib/theme'
import { useLiveGeoSnapshot } from '@/lib/use-live-geo'

export default function MapScreen() {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const landscape = width > height
  const colors = useAppColors()
  const scheme = useAppColorScheme()
  const { copy } = useI18n()
  const { settings } = useStampSettings()
  const { showError, showSuccess } = useToast()
  const live = useLiveGeoSnapshot()
  const geo = useEffectiveGeoSnapshot()
  const { mode, sticky } = useGeoSource()
  const mapRef = useRef<FieldMapHandle>(null)
  const [saving, setSaving] = useState(false)
  const padLeft = screenEdgePad(
    insets.left,
    landscape ? SCREEN_PAD : SCREEN_PAD_NARROW
  )
  const padRight = screenEdgePad(
    insets.right,
    landscape ? SCREEN_PAD : SCREEN_PAD_NARROW
  )
  const mapWidth = Math.max(1, width - padLeft - padRight)
  const mapHeight = landscape
    ? Math.round(
        Math.max(260, height - insets.top - SCREEN_HEADER_TOP_GAP - 180)
      )
    : Math.round(
        Math.max(380, Math.min(height * 0.5, height - insets.top - 230))
      )

  const focusLat = geo.lat
  const focusLon = geo.lon
  const hasCoords = focusLat != null && focusLon != null
  const infoText = useMemo(
    () => buildLocationInfoText(geo, settings),
    [geo, settings]
  )
  const canShareLocation = infoText.trim().length > 0
  const recenterToken = `${mode}:${sticky != null ? 'aimed' : 'live'}`

  const onAimDragEnd = useCallback(
    (lat: number, lon: number) => {
      void (async () => {
        const result = await moveAimedTarget(lat, lon)
        if (!result.ok) {
          showError(copy.aim.title, copy.aim.moveFailed)
          return
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        showSuccess(copy.aim.moved, `~${result.sticky.distanceM} m`)
      })()
    },
    [
      copy.aim.moved,
      copy.aim.moveFailed,
      copy.aim.title,
      showError,
      showSuccess,
    ]
  )

  const onCopy = async () => {
    await Haptics.selectionAsync()
    if (await copyText(infoText)) showSuccess(copy.map.copied)
    else showError(copy.map.copyFailed, copy.map.copyFailedBody)
  }

  const onOpenMaps = async () => {
    if (geo.lat == null || geo.lon == null) return
    await Haptics.selectionAsync()
    await softVoid('Open maps failed', async () => {
      const url = mapsOpenUrl(geo.lat!, geo.lon!)
      const canOpen = await Linking.canOpenURL(url)
      if (!canOpen) {
        showError(copy.map.openInMapsFailed, copy.map.retrySoon)
        return
      }
      await Linking.openURL(url)
    })
  }

  const onSavePhoto = async () => {
    if (saving || !hasCoords) return
    const map = mapRef.current
    if (!map) {
      showError(copy.map.savePhotoFailed, copy.map.retrySoon)
      return
    }
    await Haptics.selectionAsync()
    setSaving(true)
    try {
      const photoUri = await map.captureJpeg()
      await finalizeCapture(photoUri, geo, settings, {
        minScale: 0,
        referenceMultiplier: MAP_STAMP_SCALE,
        textColor: MAP_STAMP_SAVE_APPEARANCE.textColor,
        backgroundColor: MAP_STAMP_SAVE_APPEARANCE.backgroundColor,
        shadowColor: MAP_STAMP_SAVE_APPEARANCE.shadowColor,
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      showSuccess(copy.map.savedPhoto)
    } catch (error) {
      showError(
        copy.map.savePhotoFailed,
        errorMessage(error, copy.map.retrySoon)
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-inverse"
      style={{ paddingTop: insets.top + SCREEN_HEADER_TOP_GAP }}
    >
      <View
        style={{
          paddingLeft: padLeft,
          paddingRight: padRight,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.bold,
            fontSize: 28,
            color: colors.fg,
            letterSpacing: -0.4,
          }}
        >
          {copy.map.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconButton
            name="sliders"
            accessibilityLabel={copy.camera.stampSettings}
            onPress={() => {
              void Haptics.selectionAsync()
              router.push('/configuration')
            }}
          />
          <AimHeaderButton />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: tabScrollBottomPad(insets.bottom, { landscape }),
          paddingLeft: padLeft,
          paddingRight: padRight,
          gap: 16,
        }}
      >
        {sticky != null ? <AimModeControl expand /> : null}

        <View
          style={{
            height: mapHeight,
            borderRadius: radii.md,
            overflow: 'hidden',
            backgroundColor: colors.surfaceMuted,
          }}
        >
          {hasCoords && focusLat != null && focusLon != null ? (
            <>
              <FieldMap
                ref={mapRef}
                focusLat={focusLat}
                focusLon={focusLon}
                liveLat={live.lat}
                liveLon={live.lon}
                heading={live.heading}
                isAimedTarget={!!geo.isAimedTarget}
                aimedTitle={copy.stamp.aimedPoint}
                scheme={scheme}
                recenterToken={recenterToken}
                onAimDragEnd={geo.isAimedTarget ? onAimDragEnd : undefined}
              />
              <StampOverlay
                frameWidth={stampReferenceSize(mapWidth, mapHeight)}
                scale={MAP_STAMP_SCALE}
                appearance={mapStampLiveAppearance(scheme)}
              />
            </>
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 24,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.medium,
                  fontSize: 15,
                  lineHeight: 22,
                  color: colors.muted,
                  textAlign: 'center',
                }}
              >
                {copy.map.emptyHint}
              </Text>
            </View>
          )}
        </View>

        {landscape ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              label={copy.map.savePhoto}
              name="camera"
              onPress={() => {
                void onSavePhoto()
              }}
              loading={saving}
              disabled={!hasCoords || saving}
              flex
            />
            <Button
              label={copy.map.copy}
              name="copy"
              variant="secondary"
              onPress={() => {
                void onCopy()
              }}
              flex
              disabled={!canShareLocation}
            />
            <Button
              label={copy.map.openInMaps}
              name="externalLink"
              variant="secondary"
              onPress={() => {
                void onOpenMaps()
              }}
              flex
              disabled={!hasCoords}
            />
          </View>
        ) : (
          <>
            <Button
              label={copy.map.savePhoto}
              name="camera"
              onPress={() => {
                void onSavePhoto()
              }}
              loading={saving}
              disabled={!hasCoords || saving}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label={copy.map.copy}
                name="copy"
                variant="secondary"
                onPress={() => {
                  void onCopy()
                }}
                flex
                disabled={!canShareLocation}
              />
              <Button
                label={copy.map.openInMaps}
                name="externalLink"
                variant="secondary"
                onPress={() => {
                  void onOpenMaps()
                }}
                flex
                disabled={!hasCoords}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}
