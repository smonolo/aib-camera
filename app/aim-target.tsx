import * as Haptics from '@/lib/haptics'
import { router } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconButton } from '@/components/IconButton'
import { SegmentedControl } from '@/components/SegmentedControl'
import { useToast } from '@/components/Toast'
import {
  clearStickyTarget,
  lockAimedTarget,
  useGeoSource,
} from '@/lib/geo-source'
import { AIM_DISTANCE_PRESETS, parseAimDistanceMeters } from '@/lib/geo-math'
import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { SCREEN_PAD } from '@/lib/layout'
import { radii, useAppColors } from '@/lib/theme'
import { useLiveGeoSnapshot } from '@/lib/use-live-geo'

export default function AimTargetSheet() {
  const copy = t()
  const colors = useAppColors()
  const insets = useSafeAreaInsets()
  const { showError, showSuccess } = useToast()
  const { sticky } = useGeoSource()
  const live = useLiveGeoSnapshot()
  const [distanceText, setDistanceText] = useState('200')
  const [locking, setLocking] = useState(false)

  useEffect(() => {
    if (sticky != null) setDistanceText(String(sticky.distanceM))
  }, [sticky])

  const dismiss = useCallback(() => {
    if (router.canGoBack()) router.back()
  }, [])

  const distance = parseAimDistanceMeters(distanceText)
  const presetValue = useMemo(() => {
    const match = AIM_DISTANCE_PRESETS.find(m => String(m) === distanceText)
    return match != null ? String(match) : ''
  }, [distanceText])

  const canLock =
    !locking &&
    distance != null &&
    live.lat != null &&
    live.lon != null &&
    live.heading != null

  const onLock = useCallback(async () => {
    if (distance == null) {
      showError(copy.camera.aimTitle, copy.camera.aimBadDistance)
      return
    }
    setLocking(true)
    try {
      const result = await lockAimedTarget(distance)
      if (!result.ok) {
        const message =
          result.reason === 'no_gps'
            ? copy.camera.aimNoGps
            : result.reason === 'no_heading'
              ? copy.camera.aimNoHeading
              : copy.camera.aimBadDistance
        showError(copy.camera.aimTitle, message)
        return
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      showSuccess(copy.camera.aimLocked, `~${result.sticky.distanceM} m`)
      dismiss()
    } finally {
      setLocking(false)
    }
  }, [
    copy.camera.aimBadDistance,
    copy.camera.aimLocked,
    copy.camera.aimNoGps,
    copy.camera.aimNoHeading,
    copy.camera.aimTitle,
    dismiss,
    distance,
    showError,
    showSuccess,
  ])

  const onClear = useCallback(() => {
    void Haptics.selectionAsync()
    clearStickyTarget()
    dismiss()
  }, [dismiss])

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SCREEN_PAD,
          paddingTop: 14,
          paddingBottom: 8,
          gap: 12,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.semibold,
            fontSize: 18,
            color: colors.fg,
          }}
          numberOfLines={1}
        >
          {copy.camera.aimTitle}
        </Text>
        <IconButton
          sf="xmark"
          material="close"
          onPress={() => {
            void Haptics.selectionAsync()
            dismiss()
          }}
          accessibilityLabel={copy.camera.aimClose}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        bounces={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PAD,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          gap: 14,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 14,
            lineHeight: 20,
            color: colors.muted,
          }}
        >
          {copy.camera.aimHint}
        </Text>

        <Text
          style={{
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.muted,
          }}
        >
          {copy.camera.aimDistance}
        </Text>

        <SegmentedControl
          options={AIM_DISTANCE_PRESETS.map(meters => ({
            value: String(meters),
            label: `${meters} m`,
          }))}
          value={presetValue}
          onChange={setDistanceText}
        />

        <TextInput
          value={distanceText}
          onChangeText={setDistanceText}
          keyboardType="number-pad"
          placeholder={copy.camera.aimDistancePlaceholder}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel={copy.camera.aimDistance}
          style={{
            fontFamily: fonts.regular,
            fontSize: 16,
            color: colors.fg,
            backgroundColor: colors.surface,
            borderRadius: radii.sm,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        />

        <Pressable
          onPress={() => void onLock()}
          disabled={!canLock}
          style={{
            backgroundColor: canLock ? colors.fg : colors.surfaceMuted,
            borderRadius: radii.sm,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: fonts.semibold,
              fontSize: 16,
              color: canLock ? colors.fgInverse : colors.muted,
            }}
          >
            {copy.camera.aimLock}
          </Text>
        </Pressable>

        {sticky != null ? (
          <Pressable
            onPress={onClear}
            style={{ paddingVertical: 10, alignItems: 'center' }}
          >
            <Text
              style={{
                fontFamily: fonts.semibold,
                fontSize: 15,
                color: colors.muted,
              }}
            >
              {copy.camera.aimClear}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  )
}
