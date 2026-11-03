import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

import { AppIcon, type AppIconName } from '@/components/AppIcon'
import { fonts } from '@/lib/fonts'
import { radii, useAppColors } from '@/lib/theme'

type Props = {
  label: string
  onPress: () => void
  accessibilityLabel?: string
  name?: AppIconName
  variant?: 'primary' | 'secondary'
  loading?: boolean
  disabled?: boolean
  flex?: boolean
  style?: StyleProp<ViewStyle>
}

export function Button({
  label,
  onPress,
  accessibilityLabel,
  name,
  variant = 'primary',
  loading = false,
  disabled = false,
  flex = false,
  style,
}: Props) {
  const colors = useAppColors()
  const inactive = disabled || loading
  const filled = variant === 'primary' && !inactive
  const backgroundColor = filled ? colors.fg : colors.surfaceMuted
  const contentColor = inactive
    ? colors.muted
    : filled
      ? colors.fgInverse
      : colors.fg

  return (
    <View
      style={[
        {
          borderRadius: radii.md,
          overflow: 'hidden',
          backgroundColor,
        },
        flex && { flex: 1 },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={inactive}
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
          <ActivityIndicator color={contentColor} />
        ) : (
          <>
            {name ? (
              <AppIcon name={name} size={18} color={contentColor} />
            ) : null}
            <Text
              style={{
                fontFamily: fonts.semibold,
                fontSize: 14,
                color: contentColor,
              }}
            >
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  )
}
