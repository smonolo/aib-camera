import * as Haptics from '@/lib/haptics'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import { AppSheet } from '@/components/AppSheet'
import { SegmentedControl } from '@/components/SegmentedControl'
import { useToast } from '@/components/Toast'
import {
  clearStickyTarget,
  lockAimedTarget,
  useGeoSource,
  type LockTargetResult,
} from '@/lib/geo-source'
import { AIM_DISTANCE_PRESETS, parseAimDistanceMeters } from '@/lib/geo-math'
import { fonts } from '@/lib/fonts'
import { useDismissSheet } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { SCREEN_PAD } from '@/lib/layout'
import { radii, useAppColors } from '@/lib/theme'
import { useLiveGeoSnapshot } from '@/lib/use-live-geo'

function aimLockErrorMessage(
  reason: Extract<LockTargetResult, { ok: false }>['reason'],
  camera: ReturnType<typeof t>['camera']
): string {
  if (reason === 'no_gps') return camera.aimNoGps
  if (reason === 'no_heading') return camera.aimNoHeading
  return camera.aimBadDistance
}

export default function AimTargetSheet() {
  const copy = t()
  const colors = useAppColors()
  const { showError, showSuccess } = useToast()
  const { sticky } = useGeoSource()
  const live = useLiveGeoSnapshot()
  const dismiss = useDismissSheet()
  const [distanceText, setDistanceText] = useState('200')
  const [locking, setLocking] = useState(false)

  useEffect(() => {
    if (sticky != null) setDistanceText(String(sticky.distanceM))
  }, [sticky])

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
        showError(
          copy.camera.aimTitle,
          aimLockErrorMessage(result.reason, copy.camera)
        )
        return
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      showSuccess(copy.camera.aimLocked, `~${result.sticky.distanceM} m`)
      dismiss()
    } finally {
      setLocking(false)
    }
  }, [copy.camera, dismiss, distance, showError, showSuccess])

  const onClear = useCallback(() => {
    void Haptics.selectionAsync()
    clearStickyTarget()
    dismiss()
  }, [dismiss])

  return (
    <AppSheet
      title={copy.camera.aimTitle}
      closeLabel={copy.camera.aimClose}
      onClose={dismiss}
      height="content"
    >
      <View style={{ paddingHorizontal: SCREEN_PAD, gap: 14 }}>
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
      </View>
    </AppSheet>
  )
}
