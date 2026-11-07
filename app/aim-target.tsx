import * as Haptics from '@/lib/haptics'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Text, TextInput, View } from 'react-native'

import { AppSheet } from '@/components/AppSheet'
import { Button } from '@/components/Button'
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
import { useI18n } from '@/lib/i18n/locale-context'
import type { TranslationKeys } from '@/lib/i18n/types'
import { SCREEN_PAD } from '@/lib/layout'
import { radii, useAppColors } from '@/lib/theme'
import { useLiveGeoSnapshot } from '@/lib/use-live-geo'

function aimLockErrorMessage(
  reason: Extract<LockTargetResult, { ok: false }>['reason'],
  aim: TranslationKeys['aim']
): string {
  if (reason === 'no_gps') return aim.noGps
  if (reason === 'no_heading') return aim.noHeading
  return aim.badDistance
}

export default function AimTargetSheet() {
  const { copy } = useI18n()
  const colors = useAppColors()
  const { showError, showSuccess } = useToast()
  const { sticky } = useGeoSource()
  const live = useLiveGeoSnapshot()
  const dismiss = useDismissSheet()
  const [distanceText, setDistanceText] = useState('1000')
  const [locking, setLocking] = useState(false)

  const presetLabel = (meters: number): string => {
    if (meters >= 1000 && meters % 1000 === 0) return `${meters / 1000} km`
    return `${meters} m`
  }

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
      showError(copy.aim.title, copy.aim.badDistance)
      return
    }
    setLocking(true)
    try {
      const result = await lockAimedTarget(distance)
      if (!result.ok) {
        showError(copy.aim.title, aimLockErrorMessage(result.reason, copy.aim))
        return
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      showSuccess(copy.aim.locked, `~${result.sticky.distanceM} m`)
      dismiss()
    } finally {
      setLocking(false)
    }
  }, [copy.aim, dismiss, distance, showError, showSuccess])

  const onClear = useCallback(() => {
    void Haptics.selectionAsync()
    clearStickyTarget()
    dismiss()
  }, [dismiss])

  return (
    <AppSheet
      title={copy.aim.title}
      closeLabel={copy.aim.close}
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
          {copy.aim.hint}
        </Text>

        <Text
          style={{
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.muted,
          }}
        >
          {copy.aim.distance}
        </Text>

        <SegmentedControl
          options={AIM_DISTANCE_PRESETS.map(meters => ({
            value: String(meters),
            label: presetLabel(meters),
          }))}
          value={presetValue}
          onChange={setDistanceText}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radii.sm,
            paddingHorizontal: 14,
          }}
        >
          <TextInput
            value={distanceText}
            onChangeText={setDistanceText}
            keyboardType="number-pad"
            placeholder={copy.aim.distancePlaceholder}
            placeholderTextColor={colors.placeholder}
            accessibilityLabel={copy.aim.distance}
            style={{
              flex: 1,
              fontFamily: fonts.regular,
              fontSize: 16,
              color: colors.fg,
              paddingVertical: 12,
              paddingRight: 8,
            }}
          />
          <Text
            style={{
              fontFamily: fonts.semibold,
              fontSize: 16,
              color: colors.muted,
            }}
          >
            m
          </Text>
        </View>

        <Button
          label={copy.aim.lock}
          onPress={() => void onLock()}
          disabled={!canLock}
          loading={locking}
        />

        {sticky != null ? (
          <Button
            label={copy.aim.clear}
            onPress={onClear}
            variant="secondary"
          />
        ) : null}
      </View>
    </AppSheet>
  )
}
