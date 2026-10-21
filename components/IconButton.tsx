import type { ComponentProps } from 'react'
import { Pressable, View } from 'react-native'

import { AppIcon } from '@/components/AppIcon'
import { Surface } from '@/components/Surface'
import { radii, useAppColors } from '@/lib/theme'

type Props = {
  sf: ComponentProps<typeof AppIcon>['sf']
  material: ComponentProps<typeof AppIcon>['material']
  onPress: () => void
  accessibilityLabel: string
  size?: number
  disabled?: boolean
}

export function IconButton({
  sf,
  material,
  onPress,
  accessibilityLabel,
  size = 20,
  disabled = false,
}: Props) {
  const colors = useAppColors()

  return (
    <View
      style={{
        borderRadius: radii.full,
        overflow: 'hidden',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Surface style={{ borderRadius: radii.full }}>
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
          <AppIcon sf={sf} material={material} size={size} color={colors.fg} />
        </Pressable>
      </Surface>
    </View>
  )
}
