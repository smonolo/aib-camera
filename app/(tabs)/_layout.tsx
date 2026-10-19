import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { DynamicColorIOS, Platform, useColorScheme } from 'react-native'

import { t } from '@/lib/i18n'
import { palette } from '@/lib/theme'

export default function TabLayout() {
  const copy = t()
  const scheme = useColorScheme()
  const tint =
    Platform.OS === 'ios'
      ? DynamicColorIOS({
          light: palette.light.fg,
          dark: palette.dark.fg,
        })
      : scheme === 'dark'
        ? palette.dark.fg
        : palette.light.fg

  return (
    <NativeTabs disableTransparentOnScrollEdge tintColor={tint}>
      <NativeTabs.Trigger name="index" accessibilityLabel={copy.tabs.camera}>
        <NativeTabs.Trigger.Icon sf="camera.fill" md="photo_camera" />
        <NativeTabs.Trigger.Label hidden />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="gallery" accessibilityLabel={copy.tabs.photos}>
        <NativeTabs.Trigger.Icon sf="photo.on.rectangle" md="photo_library" />
        <NativeTabs.Trigger.Label hidden />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="settings"
        accessibilityLabel={copy.tabs.settings}
      >
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
        <NativeTabs.Trigger.Label hidden />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
