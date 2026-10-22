import * as Haptics from 'expo-haptics'
import { router, type Href } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  CardGroup,
  InfoRow,
  NavRow,
  SettingsSubscreenShell,
} from '@/components/SettingsUI'
import { useToast } from '@/components/Toast'
import { appVersionLabel, privacyPolicyUrl } from '@/lib/config'
import { t } from '@/lib/i18n'
import { SCREEN_PAD, tabScrollBottomPad } from '@/lib/layout'

export default function SettingsAboutScreen() {
  const insets = useSafeAreaInsets()
  const copy = t()
  const { showError } = useToast()
  const versionLabel = appVersionLabel()

  const onBack = () => {
    void Haptics.selectionAsync()
    router.back()
  }

  return (
    <SettingsSubscreenShell
      title={copy.settings.about}
      backLabel={copy.photos.back}
      onBack={onBack}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PAD,
          paddingBottom: tabScrollBottomPad(insets.bottom),
        }}
      >
        <CardGroup>
          <InfoRow title={copy.settings.versionLabel} body={versionLabel} />
          <NavRow
            label={copy.settings.auditLogLink}
            showDivider
            onPress={() => {
              void (async () => {
                await Haptics.selectionAsync()
                router.push('/audit-log' as Href)
              })()
            }}
          />
          <NavRow
            label={copy.settings.privacyLink}
            accessibilityRole="link"
            sf="arrow.up.right"
            material="open-in-new"
            onPress={() => {
              void (async () => {
                await Haptics.selectionAsync()
                try {
                  await WebBrowser.openBrowserAsync(privacyPolicyUrl())
                } catch {
                  showError(
                    copy.settings.privacyTitle,
                    copy.settings.privacyOpenFailed
                  )
                }
              })()
            }}
          />
        </CardGroup>
      </ScrollView>
    </SettingsSubscreenShell>
  )
}
