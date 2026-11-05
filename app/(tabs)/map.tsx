import * as Haptics from '@/lib/haptics'
import * as Linking from 'expo-linking'
import { useCallback, useMemo } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AimHeaderButton, AimModeControl } from '@/components/AimTargetControls'
import { Button } from '@/components/Button'
import { FieldMap } from '@/components/FieldMap'
import { useToast } from '@/components/Toast'
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
  actionButtonLayoutStyle,
  SCREEN_HEADER_TOP_GAP,
  SCREEN_PAD,
  SCREEN_PAD_NARROW,
  screenEdgePad,
  tabScrollBottomPad,
} from '@/lib/layout'
import {
  buildLocationShareMessage,
  mapsOpenUrl,
  shareLocationText,
} from '@/lib/location-share'
import { useStampSettings } from '@/lib/settings-context'
import { softVoid } from '@/lib/soft'
import { buildInfoStampLines, buildLocationInfoText } from '@/lib/stamp'
import { radii, useAppColorScheme, useAppColors } from '@/lib/theme'
import { useLiveGeoSnapshot } from '@/lib/use-live-geo'

const MAP_HEIGHT = 280

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
  const padLeft = screenEdgePad(
    insets.left,
    landscape ? SCREEN_PAD : SCREEN_PAD_NARROW
  )
  const padRight = screenEdgePad(
    insets.right,
    landscape ? SCREEN_PAD : SCREEN_PAD_NARROW
  )

  const focusLat = geo.lat
  const focusLon = geo.lon
  const hasCoords = focusLat != null && focusLon != null
  const infoLines = useMemo(
    () => buildInfoStampLines(geo, settings),
    [geo, settings]
  )
  const infoText = useMemo(
    () => buildLocationInfoText(geo, settings),
    [geo, settings]
  )
  const recenterToken = `${mode}:${sticky?.lockedAt ?? ''}`

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

  const onShare = async () => {
    await Haptics.selectionAsync()
    try {
      await shareLocationText(
        buildLocationShareMessage(infoText, geo.lat, geo.lon),
        copy.map.shareDialogTitle
      )
    } catch (error) {
      showError(copy.map.shareFailed, errorMessage(error, copy.map.retrySoon))
    }
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
        <AimHeaderButton />
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
            height: MAP_HEIGHT,
            borderRadius: radii.md,
            overflow: 'hidden',
            backgroundColor: colors.surfaceMuted,
          }}
        >
          {hasCoords && focusLat != null && focusLon != null ? (
            <FieldMap
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

        <View
          style={{
            borderRadius: radii.md,
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 6,
          }}
        >
          {infoLines.length > 0 ? (
            infoLines.map((line, index) => (
              <Text
                key={`${index}-${line}`}
                style={{
                  fontFamily: fonts.medium,
                  fontSize: 15,
                  lineHeight: 22,
                  color: colors.fg,
                }}
              >
                {line}
              </Text>
            ))
          ) : (
            <Text
              style={{
                fontFamily: fonts.medium,
                fontSize: 15,
                color: colors.muted,
              }}
            >
              {copy.map.noLocation}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            label={copy.map.copy}
            name="copy"
            variant="secondary"
            onPress={() => {
              void onCopy()
            }}
            flex
            disabled={infoLines.length === 0}
          />
          <Button
            label={copy.map.share}
            name="share"
            variant="secondary"
            onPress={() => {
              void onShare()
            }}
            flex
            disabled={infoLines.length === 0}
          />
        </View>

        {hasCoords ? (
          <Button
            label={copy.map.openInMaps}
            name="externalLink"
            onPress={() => {
              void onOpenMaps()
            }}
            style={actionButtonLayoutStyle(landscape)}
          />
        ) : null}
      </ScrollView>
    </View>
  )
}
