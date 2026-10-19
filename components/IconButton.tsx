import type { ComponentProps } from 'react'
import { Pressable, useColorScheme, View } from 'react-native'

import { AppIcon } from '@/components/AppIcon'
import { GlassSurface } from '@/components/GlassSurface'

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
  const scheme = useColorScheme()
  const color = forceDark || scheme === 'dark' ? '#FAFAFA' : '#171717'

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
