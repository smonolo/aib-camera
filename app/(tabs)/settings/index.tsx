import * as Haptics from 'expo-haptics'
import { router, type Href } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CardGroup, NavRow } from '@/components/SettingsUI'
import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { SCREEN_PAD, tabScrollBottomPad } from '@/lib/layout'
import { useAppColors } from '@/lib/theme'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const colors = useAppColors()
  const copy = t()

  const open = (href: Href) => {
    void (async () => {
      await Haptics.selectionAsync()
      router.push(href)
    })()
  }

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
      >
        <CardGroup>
          <NavRow
            label={copy.settings.permissions}
            showDivider
            onPress={() => open('/settings/permissions')}
          />
          <NavRow
            label={copy.settings.appearance}
            showDivider
            onPress={() => open('/settings/appearance')}
          />
          <NavRow
            label={copy.settings.about}
            onPress={() => open('/settings/about')}
          />
        </CardGroup>
      </ScrollView>
    </View>
  )
}
