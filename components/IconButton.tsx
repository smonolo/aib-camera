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
}

export function IconButton({
  sf,
  material,
  onPress,
  accessibilityLabel,
  forceDark = false,
  size = 20,
}: Props) {
  const colors = useAppColors()
  const color = forceDark ? '#FAFAFA' : colors.fg

  return (
    <View style={{ borderRadius: 999, overflow: 'hidden' }}>
      <GlassSurface
        interactive
        forceDark={forceDark}
        style={{ borderRadius: 999 }}
      >
        <Pressable
          onPress={onPress}
          accessibilityLabel={accessibilityLabel}
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
