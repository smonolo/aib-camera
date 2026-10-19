import * as Haptics from 'expo-haptics'
import { useEffect, useState, type ReactNode } from 'react'
import {
  ScrollView,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SegmentedControl } from '@/components/SegmentedControl'
import { StampPreview } from '@/components/StampPreview'
import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { useStampSettings } from '@/lib/settings-context'
import type {
  DateTimeFormat,
  StampFontSize,
  StampOpacityStep,
  StampPosition,
} from '@/lib/types'

const SCREEN_PAD = 20

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const scheme = useColorScheme()
  const fg = scheme === 'dark' ? '#FAFAFA' : '#171717'
  const muted = scheme === 'dark' ? '#A3A3A3' : '#525252'
  const surface = scheme === 'dark' ? '#1A1A1A' : '#FFFFFF'
  const border = scheme === 'dark' ? '#2A2A2A' : '#E5E5E5'
  const copy = t()
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
    await Haptics.selectionAsync()
    await updateSettings({ [key]: value } as Partial<typeof settings>)
  }

  const syncCustom = async (value: string) => {
    setCustomDraft(value)
    const lines = value
      .split('\n')
      .map(line => line.trimEnd())
      .filter((line, index, arr) => !(line === '' && index === arr.length - 1))
    await updateSettings({ customLines: lines.slice(0, 4) })
  }

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-inverse"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View style={{ paddingHorizontal: SCREEN_PAD, paddingBottom: 16 }}>
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: 28,
            color: fg,
            letterSpacing: -0.4,
          }}
        >
          {copy.settings.title}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: SCREEN_PAD,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <StampPreview
          settings={{
            ...settings,
            customLines: customDraft
              .split('\n')
              .map(line => line.trimEnd())
              .filter(Boolean)
              .slice(0, 4),
          }}
        />

        <FieldLabel color={muted}>{copy.settings.general}</FieldLabel>
        <Group>
          <ToggleRow
            label={copy.settings.dateTime}
            value={settings.showDateTime}
            onChange={value => bump('showDateTime', value)}
            fg={fg}
            surface={surface}
          />
          <ToggleRow
            label={copy.settings.coordinates}
            value={settings.showCoordinates}
            onChange={value => bump('showCoordinates', value)}
            fg={fg}
            surface={surface}
          />
          <ToggleRow
            label={copy.settings.address}
            value={settings.showAddress}
            onChange={value => bump('showAddress', value)}
            fg={fg}
            surface={surface}
          />
        </Group>

        <FieldLabel color={muted}>{copy.settings.customText}</FieldLabel>
        <TextInput
          value={customDraft}
          onChangeText={value => void syncCustom(value)}
          multiline
          placeholder={copy.settings.customPlaceholder}
          placeholderTextColor={scheme === 'dark' ? '#737373' : '#A3A3A3'}
          textAlignVertical="top"
          selectionColor={scheme === 'dark' ? '#A3A3A3' : '#525252'}
          cursorColor={fg}
          underlineColorAndroid="transparent"
          style={{
            minHeight: 100,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: surface,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: fonts.regular,
            fontSize: 15,
            color: fg,
            marginBottom: 20,
          }}
        />

        <FieldLabel color={muted}>{copy.settings.dateFormat}</FieldLabel>
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

        <FieldLabel color={muted}>{copy.settings.position}</FieldLabel>
        <View style={{ marginBottom: 20 }}>
          <SegmentedControl<StampPosition>
            value={settings.position}
            onChange={value => bump('position', value)}
            options={[
              { value: 'top', label: copy.settings.positionTop },
              { value: 'bottom', label: copy.settings.positionBottom },
            ]}
          />
        </View>

        <FieldLabel color={muted}>{copy.settings.fontSize}</FieldLabel>
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

        <FieldLabel color={muted}>{copy.settings.opacity}</FieldLabel>
        <View style={{ marginBottom: 28 }}>
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

        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 14,
            lineHeight: 20,
            color: muted,
          }}
        >
          {copy.settings.albumBody}
        </Text>
      </ScrollView>
    </View>
  )
}

function Group({ children }: { children: ReactNode }) {
  return <View style={{ marginBottom: 20, gap: 8 }}>{children}</View>
}

function FieldLabel({ children, color }: { children: string; color: string }) {
  return (
    <Text
      style={{ fontFamily: fonts.medium, fontSize: 13, color, marginBottom: 8 }}
    >
      {children}
    </Text>
  )
}

function ToggleRow({
  label,
  value,
  onChange,
  fg,
  surface,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  fg: string
  surface: string
}) {
  return (
    <View
      style={{
        height: 52,
        borderRadius: 14,
        backgroundColor: surface,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.regular,
          fontSize: 15,
          color: fg,
          marginRight: 12,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={{ justifyContent: 'center', height: 52 }}>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: '#D4D4D4', true: '#404040' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#D4D4D4"
          style={{ transform: [{ scaleX: 0.92 }, { scaleY: 0.92 }] }}
        />
      </View>
    </View>
  )
}
