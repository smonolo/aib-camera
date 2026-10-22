import * as Haptics from '@/lib/haptics'
import { useEffect, useState } from 'react'
import { ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SegmentedControl } from '@/components/SegmentedControl'
import {
  CardGroup,
  FieldLabel,
  SettingsSubscreenShell,
  ToggleRow,
} from '@/components/SettingsUI'
import { fonts } from '@/lib/fonts'
import { useHapticBack } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { SCREEN_PAD } from '@/lib/layout'
import { useStampSettings } from '@/lib/settings-context'
import { parseCustomLines } from '@/lib/stamp'
import { radii, useAppColors } from '@/lib/theme'
import type {
  DateTimeFormat,
  StampFontSize,
  StampOpacityStep,
} from '@/lib/types'

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets()
  const colors = useAppColors()
  const copy = t()
  const onBack = useHapticBack()
  const { settings, updateSettings, ready } = useStampSettings()
  const [customDraft, setCustomDraft] = useState(
    settings.customLines.join('\n')
  )

  useEffect(() => {
    if (ready) setCustomDraft(settings.customLines.join('\n'))
  }, [ready])

  const bump = async <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K]
  ) => {
    if (typeof value !== 'boolean') await Haptics.selectionAsync()
    await updateSettings({ [key]: value } as Partial<typeof settings>)
  }

  const syncCustom = async (value: string) => {
    setCustomDraft(value)
    await updateSettings({ customLines: parseCustomLines(value) })
  }

  return (
    <SettingsSubscreenShell
      title={copy.settings.configuration}
      backLabel={copy.photos.back}
      onBack={onBack}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PAD,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
        keyboardShouldPersistTaps="handled"
      >
        <FieldLabel color={colors.muted}>{copy.settings.general}</FieldLabel>
        <CardGroup>
          <ToggleRow
            label={copy.settings.dateTime}
            value={settings.showDateTime}
            onChange={value => bump('showDateTime', value)}
          />
          <ToggleRow
            label={copy.settings.coordinates}
            value={settings.showCoordinates}
            onChange={value => bump('showCoordinates', value)}
          />
          <ToggleRow
            label={copy.settings.address}
            value={settings.showAddress}
            onChange={value => bump('showAddress', value)}
          />
          <ToggleRow
            label={copy.settings.accuracy}
            value={settings.showAccuracy}
            onChange={value => bump('showAccuracy', value)}
          />
          <ToggleRow
            label={copy.settings.altitude}
            value={settings.showAltitude}
            onChange={value => bump('showAltitude', value)}
          />
          <ToggleRow
            label={copy.settings.heading}
            value={settings.showHeading}
            onChange={value => bump('showHeading', value)}
            isLast
          />
        </CardGroup>

        <FieldLabel color={colors.muted}>{copy.settings.customText}</FieldLabel>
        <TextInput
          value={customDraft}
          onChangeText={value => void syncCustom(value)}
          multiline
          placeholder={copy.settings.customPlaceholder}
          placeholderTextColor={colors.placeholder}
          textAlignVertical="top"
          selectionColor={colors.selection}
          cursorColor={colors.fg}
          underlineColorAndroid="transparent"
          style={{
            minHeight: 100,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: fonts.regular,
            fontSize: 15,
            color: colors.fg,
            marginBottom: 20,
          }}
        />

        <FieldLabel color={colors.muted}>{copy.settings.dateFormat}</FieldLabel>
        <View style={{ marginBottom: 20 }}>
          <SegmentedControl<DateTimeFormat>
            value={settings.dateTimeFormat}
            onChange={value => bump('dateTimeFormat', value)}
            options={[
              { value: 'it-full', label: copy.settings.formatFull },
              { value: 'it-short', label: copy.settings.formatShort },
              { value: 'iso', label: copy.settings.formatIso },
            ]}
          />
        </View>

        <FieldLabel color={colors.muted}>{copy.settings.fontSize}</FieldLabel>
        <View style={{ marginBottom: 20 }}>
          <SegmentedControl<StampFontSize>
            value={settings.fontSize}
            onChange={value => bump('fontSize', value)}
            options={[
              { value: 'small', label: copy.settings.sizeSmall },
              { value: 'medium', label: copy.settings.sizeMedium },
              { value: 'large', label: copy.settings.sizeLarge },
            ]}
          />
        </View>

        <FieldLabel color={colors.muted}>{copy.settings.opacity}</FieldLabel>
        <View style={{ marginBottom: 8 }}>
          <SegmentedControl<StampOpacityStep>
            value={settings.opacity}
            onChange={value => bump('opacity', value)}
            options={[
              { value: 0, label: '0%' },
              { value: 0.25, label: '25%' },
              { value: 0.5, label: '50%' },
              { value: 0.75, label: '75%' },
              { value: 1, label: '100%' },
            ]}
          />
        </View>
      </ScrollView>
    </SettingsSubscreenShell>
  )
}
