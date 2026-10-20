import * as Haptics from 'expo-haptics'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState, type ReactNode } from 'react'
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SegmentedControl } from '@/components/SegmentedControl'
import { StampPreview } from '@/components/StampPreview'
import { useToast } from '@/components/Toast'
import { appVersionLabel, privacyPolicyUrl } from '@/lib/config'
import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { TAB_BAR_CLEARANCE } from '@/lib/layout'
import { useStampSettings } from '@/lib/settings-context'
import { parseCustomLines } from '@/lib/stamp'
import { useAppColors } from '@/lib/theme'
import type {
  DateTimeFormat,
  StampFontSize,
  StampOpacityStep,
} from '@/lib/types'

const SCREEN_PAD = 20

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const colors = useAppColors()
  const copy = t()
  const { showError } = useToast()
  const { settings, updateSettings, ready } = useStampSettings()
  const [customDraft, setCustomDraft] = useState(
    settings.customLines.join('\n')
  )
  const versionLabel = appVersionLabel()

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
    await updateSettings({ customLines: parseCustomLines(value) })
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
            color: colors.fg,
            letterSpacing: -0.4,
          }}
        >
          {copy.settings.title}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + 28,
          paddingHorizontal: SCREEN_PAD,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <StampPreview
          settings={{
            ...settings,
            customLines: parseCustomLines(customDraft, { dropEmpty: true }),
          }}
        />

        <FieldLabel color={colors.muted}>{copy.settings.general}</FieldLabel>
        <ToggleGroup>
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
        </ToggleGroup>

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
            borderRadius: 14,
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
            color: colors.muted,
            marginBottom: 28,
          }}
        >
          {copy.settings.albumBody}
        </Text>

        <FieldLabel color={colors.muted}>{copy.settings.about}</FieldLabel>
        <Group>
          <InfoCard
            title={copy.settings.versionLabel}
            body={versionLabel}
            colors={colors}
          />
          <InfoCard
            title={copy.settings.disclaimerTitle}
            body={copy.settings.disclaimerBody}
            colors={colors}
          />
          <InfoCard
            title={copy.settings.privacyTitle}
            body={copy.settings.privacyBody}
            colors={colors}
          />
          <Pressable
            onPress={() => {
              void (async () => {
                await Haptics.selectionAsync()
                try {
                  await WebBrowser.openBrowserAsync(privacyPolicyUrl())
                } catch {
                  showError(
                    copy.settings.privacyTitle,
                    copy.settings.privacyOpenFailed
                  )
                }
              })()
            }}
            accessibilityRole="link"
            accessibilityLabel={copy.settings.privacyLink}
            style={{
              minHeight: 52,
              borderRadius: 14,
              backgroundColor: colors.surface,
              paddingHorizontal: 14,
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: fonts.semibold,
                fontSize: 15,
                color: colors.fg,
              }}
            >
              {copy.settings.privacyLink}
            </Text>
          </Pressable>
        </Group>
      </ScrollView>
    </View>
  )
}

function InfoCard({
  title,
  body,
  colors,
}: {
  title: string
  body: string
  colors: ReturnType<typeof useAppColors>
}) {
  return (
    <View
      style={{
        borderRadius: 14,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 4,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: 14,
          color: colors.fg,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.regular,
          fontSize: 13,
          lineHeight: 18,
          color: colors.muted,
        }}
      >
        {body}
      </Text>
    </View>
  )
}

function Group({ children }: { children: ReactNode }) {
  return <View style={{ marginBottom: 20, gap: 8 }}>{children}</View>
}

function ToggleGroup({ children }: { children: ReactNode }) {
  const colors = useAppColors()

  return (
    <View
      style={{
        marginBottom: 20,
        borderRadius: 14,
        backgroundColor: colors.surface,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  )
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
  isLast = false,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  isLast?: boolean
}) {
  const colors = useAppColors()

  return (
    <View
      style={{
        height: 52,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.regular,
          fontSize: 15,
          color: colors.fg,
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
          trackColor={{
            false: colors.borderStrong,
            true: colors.trackActive,
          }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.borderStrong}
          style={{ transform: [{ scaleX: 0.92 }, { scaleY: 0.92 }] }}
        />
      </View>
    </View>
  )
}
