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
import { Surface } from '@/components/Surface'
import { fonts } from '@/lib/fonts'
import { radii, useAppColors } from '@/lib/theme'

type Props = {
  label: string
  onPress: () => void
  accessibilityLabel?: string
  sf?: ComponentProps<typeof AppIcon>['sf']
  material?: ComponentProps<typeof AppIcon>['material']
  loading?: boolean
  disabled?: boolean
  flex?: boolean
  style?: StyleProp<ViewStyle>
}

export function Button({
  label,
  onPress,
  accessibilityLabel,
  sf,
  material,
  loading = false,
  disabled = false,
  flex = false,
  style,
}: Props) {
  const colors = useAppColors()

  return (
    <View
      style={[
        { borderRadius: radii.md, overflow: 'hidden' },
        flex && { flex: 1 },
        style,
      ]}
    >
      <Surface style={{ borderRadius: radii.md }}>
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
            <ActivityIndicator color={colors.fg} />
          ) : (
            <>
              {sf && material ? (
                <AppIcon
                  sf={sf}
                  material={material}
                  size={18}
                  color={colors.fg}
                />
              ) : null}
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 14,
                  color: colors.fg,
                }}
              >
                {label}
              </Text>
            </>
          )}
        </Pressable>
      </Surface>
    </View>
  )
}
