import type { ComponentProps } from 'react'
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'

import { AppIcon } from '@/components/AppIcon'
import { Surface } from '@/components/Surface'
import { CAMERA } from '@/lib/layout'
import { radii, useAppColors } from '@/lib/theme'

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
  color,
  backgroundColor,
  style,
}: Props) {
  const colors = useAppColors()
  const iconColor = color ?? colors.fg

  return (
    <View
      style={[
        {
          position: 'absolute',
          width: CAMERA.sideButton,
          height: CAMERA.sideButton,
          borderRadius: radii.full,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Surface
        style={{
          borderRadius: radii.full,
          width: '100%',
          height: '100%',
          ...(backgroundColor != null ? { backgroundColor } : null),
        }}
      >
        <Pressable
          onPress={onPress}
          accessibilityLabel={accessibilityLabel}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon
            sf={sf}
            material={material}
            size={CAMERA.sideIcon}
            color={iconColor}
          />
        </Pressable>
      </Surface>
    </View>
  )
}
