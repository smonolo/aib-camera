import * as Haptics from '@/lib/haptics'
import { router } from 'expo-router'
import { View } from 'react-native'

import { CameraChromeButton } from '@/components/CameraChromeButton'
import { SegmentedControl } from '@/components/SegmentedControl'
import { setGeoSourceMode, useGeoSource } from '@/lib/geo-source'
import { useI18n } from '@/lib/i18n/locale-context'
import { CAMERA } from '@/lib/layout'
import { useAppColors } from '@/lib/theme'
import type { GeoSourceMode } from '@/lib/types'

export function AimChromeButton() {
  const { copy } = useI18n()
  const colors = useAppColors()
  const { mode, sticky } = useGeoSource()
  const targetActive = mode === 'target' && sticky != null

  return (
    <CameraChromeButton
      onPress={() => {
        void Haptics.selectionAsync()
        router.push('/aim-target')
      }}
      accessibilityLabel={copy.camera.aim}
      name="crosshair"
      backgroundColor={targetActive ? colors.fg : undefined}
      color={targetActive ? colors.fgInverse : undefined}
    />
  )
}

export function AimModeToggle({ top }: { top: number }) {
  const { copy } = useI18n()
  const { mode, sticky } = useGeoSource()

  if (sticky == null) return null

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top,
        height: CAMERA.sideButton,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View accessibilityLabel={copy.camera.aimToggle}>
        <SegmentedControl
          expand={false}
          value={mode}
          options={[
            { value: 'me' as GeoSourceMode, label: copy.camera.aimModeMe },
            {
              value: 'target' as GeoSourceMode,
              label: copy.camera.aimModeTarget,
            },
          ]}
          onChange={setGeoSourceMode}
        />
      </View>
    </View>
  )
}
