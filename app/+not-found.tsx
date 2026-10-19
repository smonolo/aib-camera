import { Link, Stack } from 'expo-router'
import { Text, useColorScheme, View } from 'react-native'

import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'

export default function NotFoundScreen() {
  const scheme = useColorScheme()
  const fg = scheme === 'dark' ? '#FAFAFA' : '#171717'
  const muted = scheme === 'dark' ? '#A3A3A3' : '#525252'
  const copy = t()

  return (
    <>
      <Stack.Screen options={{ title: '…' }} />
      <View className="flex-1 items-center justify-center bg-canvas px-6 dark:bg-canvas-inverse">
        <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: fg }}>
          {copy.notFound.title}
        </Text>
        <Link href="/" className="mt-4">
          <Text
            style={{ fontFamily: fonts.medium, fontSize: 16, color: muted }}
          >
            {copy.notFound.back}
          </Text>
        </Link>
      </View>
    </>
  )
}
