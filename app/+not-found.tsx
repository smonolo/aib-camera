import { Link, Stack } from 'expo-router'
import { Text, View } from 'react-native'

import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { useAppColors } from '@/lib/theme'

export default function NotFoundScreen() {
  const colors = useAppColors()
  const copy = t()

  return (
    <>
      <Stack.Screen options={{ title: '…' }} />
      <View className="flex-1 items-center justify-center bg-canvas px-6 dark:bg-canvas-inverse">
        <Text
          style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.fg }}
        >
          {copy.notFound.title}
        </Text>
        <Link href="/" className="mt-4">
          <Text
            style={{
              fontFamily: fonts.medium,
              fontSize: 16,
              color: colors.muted,
            }}
          >
            {copy.notFound.back}
          </Text>
        </Link>
      </View>
    </>
  )
}
