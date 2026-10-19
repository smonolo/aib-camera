import type { ComponentProps } from 'react'
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

import { AppIcon } from '@/components/AppIcon'
import { GlassSurface } from '@/components/GlassSurface'
import { fonts } from '@/lib/fonts'
import { useAppColors } from '@/lib/theme'

type Props = {
  label: string
  onPress: () => void
  accessibilityLabel?: string
  sf?: ComponentProps<typeof AppIcon>['sf']
  material?: ComponentProps<typeof AppIcon>['material']
  loading?: boolean
  disabled?: boolean
  forceDark?: boolean
  flex?: boolean
  style?: StyleProp<ViewStyle>
}

export function GlassButton({
  label,
  onPress,
  accessibilityLabel,
  sf,
  material,
  loading = false,
  disabled = false,
  forceDark = false,
  flex = false,
  style,
}: Props) {
  const colors = useAppColors()
  const color = forceDark ? '#FAFAFA' : colors.fg

  return (
    <View
      style={[
        { borderRadius: 16, overflow: 'hidden' },
        flex && { flex: 1 },
        style,
      ]}
    >
      <GlassSurface
        interactive
        forceDark={forceDark}
        style={{ borderRadius: 16 }}
      >
        <Pressable
          onPress={onPress}
          disabled={disabled || loading}
          accessibilityLabel={accessibilityLabel ?? label}
          style={{
            minHeight: 52,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingHorizontal: 12,
          }}
        >
          {loading ? (
            <ActivityIndicator color={color} />
          ) : (
            <>
              {sf && material ? (
                <AppIcon sf={sf} material={material} size={18} color={color} />
              ) : null}
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 14,
                  color,
                }}
              >
                {label}
              </Text>
            </>
          )}
        </Pressable>
      </GlassSurface>
    </View>
  )
}
