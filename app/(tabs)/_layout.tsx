import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { DynamicColorIOS, Platform } from 'react-native'

import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { palette, useAppColorScheme } from '@/lib/theme'

export default function TabLayout() {
  const copy = t()
  const scheme = useAppColorScheme()
  const colors = scheme === 'dark' ? palette.dark : palette.light
  const tint =
    Platform.OS === 'ios'
      ? DynamicColorIOS({
          light: palette.light.fg,
          dark: palette.dark.fg,
        })
      : colors.fg

  const androidBar =
    Platform.OS === 'android'
      ? {
          backgroundColor: colors.surface,
          indicatorColor: colors.surfaceMuted,
          rippleColor:
            scheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          iconColor: {
            default: colors.muted,
            selected: colors.fg,
          },
        }
      : null

  return (
    <NativeTabs
      disableTransparentOnScrollEdge
      tintColor={tint}
      labelStyle={{ fontFamily: fonts.medium }}
      {...(androidBar ?? {})}
    >
      <NativeTabs.Trigger name="index" accessibilityLabel={copy.tabs.camera}>
        <NativeTabs.Trigger.Icon sf="camera.fill" md="photo_camera" />
        <NativeTabs.Trigger.Label>{copy.tabs.camera}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="gallery" accessibilityLabel={copy.tabs.photos}>
        <NativeTabs.Trigger.Icon sf="photo.on.rectangle" md="photo_library" />
        <NativeTabs.Trigger.Label>{copy.tabs.photos}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="settings"
        accessibilityLabel={copy.tabs.settings}
      >
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
        <NativeTabs.Trigger.Label>
          {copy.tabs.settings}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
