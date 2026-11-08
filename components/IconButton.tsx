import { Pressable, View } from 'react-native'

import { AppIcon, type AppIconName } from '@/components/AppIcon'
import { CAMERA } from '@/lib/layout'
import { radii, useAppColors } from '@/lib/theme'

type Props = {
  name: AppIconName
  onPress: () => void
  accessibilityLabel: string
  size?: number
  disabled?: boolean
  emphasized?: boolean
}

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  size = CAMERA.sideIcon,
  disabled = false,
  emphasized = false,
}: Props) {
  const colors = useAppColors()
  const backgroundColor = emphasized ? colors.fg : colors.surfaceMuted
  const iconColor = emphasized ? colors.fgInverse : colors.fg

  return (
    <View
      style={{
        borderRadius: radii.full,
        overflow: 'hidden',
        backgroundColor,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        hitSlop={8}
        style={{
          width: CAMERA.sideButton,
          height: CAMERA.sideButton,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name={name} size={size} color={iconColor} />
      </Pressable>
    </View>
  )
}
