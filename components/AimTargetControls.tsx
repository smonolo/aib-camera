import * as Haptics from '@/lib/haptics'
import { router } from 'expo-router'
import { View } from 'react-native'

import { CameraChromeButton } from '@/components/CameraChromeButton'
import { IconButton } from '@/components/IconButton'
import { SegmentedControl } from '@/components/SegmentedControl'
import { setGeoSourceMode, useGeoSource } from '@/lib/geo-source'
import { useI18n } from '@/lib/i18n/locale-context'
import { useAppColors } from '@/lib/theme'
import type { GeoSourceMode } from '@/lib/types'

export function openAimTargetSheet(): void {
  router.push('/aim-target')
}

export function AimModeControl({ expand = false }: { expand?: boolean }) {
  const { copy } = useI18n()
  const { mode, sticky } = useGeoSource()

  if (sticky == null) return null

  return (
    <View accessibilityLabel={copy.aim.toggle}>
      <SegmentedControl
        expand={expand}
        value={mode}
        options={[
          { value: 'me' as GeoSourceMode, label: copy.aim.modeMe },
          {
            value: 'target' as GeoSourceMode,
            label: copy.aim.modeTarget,
          },
        ]}
        onChange={setGeoSourceMode}
      />
    </View>
  )
}

export function AimChromeButton() {
  const { copy } = useI18n()
  const colors = useAppColors()
  const { mode, sticky } = useGeoSource()
  const targetActive = mode === 'target' && sticky != null

  return (
    <CameraChromeButton
      onPress={() => {
        void Haptics.selectionAsync()
        openAimTargetSheet()
      }}
      accessibilityLabel={copy.aim.open}
      name="crosshair"
      backgroundColor={targetActive ? colors.fg : undefined}
      color={targetActive ? colors.fgInverse : undefined}
    />
  )
}

export function AimHeaderButton() {
  const { copy } = useI18n()
  const { mode, sticky } = useGeoSource()
  const targetActive = mode === 'target' && sticky != null

  return (
    <IconButton
      name="crosshair"
      accessibilityLabel={copy.aim.open}
      emphasized={targetActive}
      onPress={() => {
        void Haptics.selectionAsync()
        openAimTargetSheet()
      }}
    />
  )
}
