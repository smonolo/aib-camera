import { Pressable, View } from 'react-native'

import { AppIcon, type AppIconName } from '@/components/AppIcon'
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
  size = 20,
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
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name={name} size={size} color={iconColor} />
      </Pressable>
    </View>
  )
}
