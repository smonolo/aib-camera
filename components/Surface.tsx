import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'

import { useAppColors } from '@/lib/theme'

type Props = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  className?: string
  clipped?: boolean
}

export function Surface({
  children,
  style,
  className,
  clipped = false,
}: Props) {
  const colors = useAppColors()

  return (
    <View
      className={className}
      style={[
        {
          backgroundColor: colors.surfaceMuted,
          overflow: clipped ? 'hidden' : undefined,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
