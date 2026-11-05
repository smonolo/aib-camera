import { BlurTargetView } from 'expo-blur'
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui'
import { useRef } from 'react'

import { AppTabBar } from '@/components/AppTabBar'
import { useI18n } from '@/lib/i18n/locale-context'
import { TabBlurTargetProvider, type TabBlurHost } from '@/lib/tab-blur'

export default function TabLayout() {
  const { copy } = useI18n()
  const blurTargetRef = useRef<TabBlurHost | null>(null)

  return (
    <TabBlurTargetProvider targetRef={blurTargetRef}>
      <Tabs style={{ flex: 1 }}>
        <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
          <TabSlot style={{ flex: 1 }} />
        </BlurTargetView>

        <AppTabBar />

        <TabList style={{ display: 'none' }}>
          <TabTrigger
            name="index"
            href="/"
            accessibilityLabel={copy.tabs.camera}
          />
          <TabTrigger
            name="map"
            href="/map"
            accessibilityLabel={copy.tabs.map}
          />
          <TabTrigger
            name="gallery"
            href="/gallery"
            accessibilityLabel={copy.tabs.photos}
          />
          <TabTrigger
            name="settings"
            href="/settings"
            accessibilityLabel={copy.tabs.settings}
          />
        </TabList>
      </Tabs>
    </TabBlurTargetProvider>
  )
}
