import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { DynamicColorIOS, Platform, useColorScheme } from 'react-native'

import { t } from '@/lib/i18n'

export default function TabLayout() {
  const copy = t()
  const scheme = useColorScheme()
  const tint =
    Platform.OS === 'ios'
      ? DynamicColorIOS({ light: '#171717', dark: '#FAFAFA' })
      : scheme === 'dark'
        ? '#FAFAFA'
        : '#171717'

  return (
    <NativeTabs
      disableTransparentOnScrollEdge
      tintColor={tint}
      labelStyle={{
        fontFamily: 'Geist_500Medium',
        fontSize: 11,
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="camera.fill" md="photo_camera" />
        <NativeTabs.Trigger.Label>{copy.tabs.camera}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="gallery">
        <NativeTabs.Trigger.Icon sf="photo.on.rectangle" md="photo_library" />
        <NativeTabs.Trigger.Label>{copy.tabs.photos}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
        <NativeTabs.Trigger.Label>
          {copy.tabs.settings}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
