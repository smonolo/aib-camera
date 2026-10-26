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

type Props = {
  topInset: number
}

export function AimTargetControls({ topInset }: Props) {
  const { copy } = useI18n()
  const colors = useAppColors()
  const { mode, sticky } = useGeoSource()
  const targetActive = mode === 'target' && sticky != null
  const chromeTop = topInset + CAMERA.topChromePad

  return (
    <>
      <CameraChromeButton
        onPress={() => {
          void Haptics.selectionAsync()
          router.push('/aim-target')
        }}
        accessibilityLabel={copy.camera.aim}
        sf="scope"
        material="gps-fixed"
        backgroundColor={targetActive ? colors.fg : undefined}
        color={targetActive ? colors.fgInverse : undefined}
        style={{
          top: chromeTop,
          left: CAMERA.thumbInset + CAMERA.sideButton + 12,
        }}
      />

      {sticky != null ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: chromeTop,
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
      ) : null}
    </>
  )
}
