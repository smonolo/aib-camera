import type { ComponentProps } from 'react'
import { Pressable, View } from 'react-native'

import { AppIcon } from '@/components/AppIcon'
import { GlassSurface } from '@/components/GlassSurface'
import { useAppColors } from '@/lib/theme'

type Props = {
  sf: ComponentProps<typeof AppIcon>['sf']
  material: ComponentProps<typeof AppIcon>['material']
  onPress: () => void
  accessibilityLabel: string
  forceDark?: boolean
  size?: number
  disabled?: boolean
}

export function IconButton({
  sf,
  material,
  onPress,
  accessibilityLabel,
  forceDark = false,
  size = 20,
  disabled = false,
}: Props) {
  const colors = useAppColors()
  const color = forceDark ? '#FAFAFA' : colors.fg

  return (
    <View
      style={{
        borderRadius: 999,
        overflow: 'hidden',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <GlassSurface
        interactive
        forceDark={forceDark}
        style={{ borderRadius: 999 }}
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
          <AppIcon sf={sf} material={material} size={size} color={color} />
        </Pressable>
      </GlassSurface>
    </View>
  )
}
