import { Stack } from 'expo-router'

import { useAppColors } from '@/lib/theme'

export default function SettingsTabStackLayout() {
  const colors = useAppColors()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="permissions" />
      <Stack.Screen name="appearance" />
      <Stack.Screen name="about" />
    </Stack>
  )
}
