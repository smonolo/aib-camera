import { Image } from 'expo-image'
import { Text, View } from 'react-native'

import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { useAppColors } from '@/lib/theme'

type Props = {
  size?: 'medium' | 'large'
  showTitle?: boolean
}

export function AppMark({ size = 'medium', showTitle = true }: Props) {
  const colors = useAppColors()
  const icon = size === 'large' ? 88 : 72

  return (
    <View style={{ alignItems: 'center' }}>
      <Image
        source={require('../assets/images/app-mark.png')}
        style={{ width: icon, height: icon, borderRadius: icon * 0.22 }}
        contentFit="cover"
      />
      {showTitle ? (
        <Text
          style={{
            marginTop: 16,
            fontFamily: fonts.semibold,
            fontSize: size === 'large' ? 28 : 22,
            letterSpacing: -0.4,
            color: colors.fg,
          }}
        >
          {t().splash.title}
        </Text>
      ) : null}
    </View>
  )
}
