import type { ComponentProps } from 'react'
import { Pressable, type StyleProp, type ViewStyle } from 'react-native'

import { AppIcon } from '@/components/AppIcon'
import { CAMERA } from '@/lib/layout'
import { cameraOverlay, radii } from '@/lib/theme'

type Props = {
  onPress: () => void
  accessibilityLabel: string
  sf: ComponentProps<typeof AppIcon>['sf']
  material: ComponentProps<typeof AppIcon>['material']
  color?: string
  backgroundColor?: string
  style?: StyleProp<ViewStyle>
}

export function CameraChromeButton({
  onPress,
  accessibilityLabel,
  sf,
  material,
  color = '#FAFAFA',
  backgroundColor = cameraOverlay.fill,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          position: 'absolute',
          width: CAMERA.sideButton,
          height: CAMERA.sideButton,
          borderRadius: radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor,
        },
        style,
      ]}
    >
      <AppIcon
        sf={sf}
        material={material}
        size={CAMERA.sideIcon}
        color={color}
      />
    </Pressable>
  )
}
