import * as Haptics from 'expo-haptics'
import * as Linking from 'expo-linking'
import * as Location from 'expo-location'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/AppIcon'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Toggle } from '@/components/Toggle'
import { useToast } from '@/components/Toast'
import { appVersionLabel, privacyPolicyUrl } from '@/lib/config'
import { fonts } from '@/lib/fonts'
import { useOnAppActive } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { SCREEN_PAD, tabScrollBottomPad } from '@/lib/layout'
import { ensureForegroundLocationPermission } from '@/lib/location'
import { useStampSettings } from '@/lib/settings-context'
import { formatStampDateTime, parseCustomLines } from '@/lib/stamp'
import { radii, useAppColors } from '@/lib/theme'
import type {
  DateTimeFormat,
  StampFontSize,
  StampOpacityStep,
} from '@/lib/types'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const colors = useAppColors()
  const copy = t()
  const { showError } = useToast()
  const { settings, updateSettings, ready } = useStampSettings()
  const [customDraft, setCustomDraft] = useState(
    settings.customLines.join('\n')
  )
  const [locationGranted, setLocationGranted] = useState(false)
  const [locationCanAsk, setLocationCanAsk] = useState(true)
  const versionLabel = appVersionLabel()

  const refreshLocationPermission = useCallback(async () => {
    const result = await Location.getForegroundPermissionsAsync()
    setLocationGranted(result.granted)
    setLocationCanAsk(result.granted || result.canAskAgain)
  }, [])

  useEffect(() => {
    if (ready) setCustomDraft(settings.customLines.join('\n'))
  }, [ready])

  useEffect(() => {
    void refreshLocationPermission()
  }, [refreshLocationPermission])

  useOnAppActive(() => {
    void refreshLocationPermission()
  })

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

  const dateFormatExample = formatStampDateTime(
    new Date(),
    settings.dateTimeFormat
  )

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
          paddingBottom: tabScrollBottomPad(insets.bottom),
          paddingHorizontal: SCREEN_PAD,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <FieldLabel color={colors.muted}>
          {copy.settings.permissions}
        </FieldLabel>
        <CardGroup>
          <Pressable
            onPress={() => {
              void (async () => {
                await Haptics.selectionAsync()
                if (locationGranted) return
                if (locationCanAsk) {
                  await ensureForegroundLocationPermission()
                  await refreshLocationPermission()
                  return
                }
                await Linking.openSettings()
              })()
            }}
            accessibilityRole="button"
            accessibilityLabel={copy.settings.locationPermission}
            style={{
              minHeight: 52,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.regular,
                fontSize: 15,
                color: colors.fg,
              }}
            >
              {copy.settings.locationPermission}
            </Text>
            <Text
              style={{
                fontFamily: fonts.semibold,
                fontSize: 13,
                color: colors.muted,
              }}
            >
              {locationGranted
                ? copy.settings.locationAllowed
                : locationCanAsk
                  ? copy.settings.locationAsk
                  : copy.settings.locationOpenSettings}
            </Text>
          </Pressable>
        </CardGroup>

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
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 13,
              lineHeight: 18,
              color: colors.muted,
              marginTop: 8,
            }}
          >
            {dateFormatExample}
          </Text>
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

        <FieldLabel color={colors.muted}>{copy.settings.about}</FieldLabel>
        <CardGroup>
          <InfoRow
            title={copy.settings.versionLabel}
            body={versionLabel}
            colors={colors}
          />
          <InfoRow
            title={copy.settings.disclaimerTitle}
            body={copy.settings.disclaimerBody}
            colors={colors}
          />
          <InfoRow
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
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.semibold,
                fontSize: 15,
                color: colors.fg,
              }}
            >
              {copy.settings.privacyLink}
            </Text>
            <AppIcon
              sf="arrow.up.right"
              material="open-in-new"
              size={18}
              color={colors.muted}
            />
          </Pressable>
        </CardGroup>
      </ScrollView>
    </View>
  )
}

function InfoRow({
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
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
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

function CardGroup({ children }: { children: ReactNode }) {
  const colors = useAppColors()

  return (
    <View
      style={{
        marginBottom: 20,
        borderRadius: radii.md,
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
      <Toggle value={value} onValueChange={onChange} />
    </View>
  )
}
