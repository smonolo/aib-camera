import { Image } from 'expo-image'
import { Text, useColorScheme, View } from 'react-native'

import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'

type Props = {
  size?: 'medium' | 'large'
  showTitle?: boolean
}

export function AppMark({ size = 'medium', showTitle = true }: Props) {
  const scheme = useColorScheme()
  const fg = scheme === 'dark' ? '#FAFAFA' : '#171717'
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
            color: fg,
          }}
        >
          {t().splash.title}
        </Text>
      ) : null}
    </View>
  )
}
