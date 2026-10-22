import { Stack } from 'expo-router'

import { useAppColors } from '@/lib/theme'

export default function SettingsTabStackLayout() {
  const colors = useAppColors()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  )
}
