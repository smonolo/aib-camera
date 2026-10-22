import type { ComponentProps, ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/AppIcon'
import { IconButton } from '@/components/IconButton'
import { Toggle } from '@/components/Toggle'
import { fonts } from '@/lib/fonts'
import { SCREEN_PAD_NARROW } from '@/lib/layout'
import { radii, useAppColors } from '@/lib/theme'

export function SettingsSubscreenShell({
  title,
  backLabel,
  onBack,
  headerRight,
  children,
}: {
  title: string
  backLabel: string
  onBack: () => void
  headerRight?: ReactNode
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  const colors = useAppColors()

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-inverse"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View
        style={{
          paddingHorizontal: SCREEN_PAD_NARROW,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          minHeight: 40,
        }}
      >
        <View style={{ zIndex: 1 }}>
          <IconButton
            sf="chevron.backward"
            material="arrow-back"
            onPress={onBack}
            accessibilityLabel={backLabel}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: SCREEN_PAD_NARROW,
            right: SCREEN_PAD_NARROW,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              textAlign: 'center',
              fontFamily: fonts.semibold,
              fontSize: 17,
              color: colors.fg,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <View style={{ zIndex: 1, minWidth: 40, alignItems: 'flex-end' }}>
          {headerRight ?? <View style={{ width: 40, height: 40 }} />}
        </View>
      </View>
      {children}
    </View>
  )
}

export function CardGroup({ children }: { children: ReactNode }) {
  const colors = useAppColors()

  return (
    <View
      style={{
        marginBottom: 20,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  )
}

export function FieldLabel({
  children,
  color,
}: {
  children: string
  color: string
}) {
  return (
    <Text
      style={{ fontFamily: fonts.medium, fontSize: 13, color, marginBottom: 8 }}
    >
      {children}
    </Text>
  )
}

export function NavRow({
  label,
  onPress,
  accessibilityRole = 'button',
  sf = 'chevron.right',
  material = 'chevron-right',
  showDivider = false,
}: {
  label: string
  onPress: () => void
  accessibilityRole?: 'button' | 'link'
  sf?: ComponentProps<typeof AppIcon>['sf']
  material?: ComponentProps<typeof AppIcon>['material']
  showDivider?: boolean
}) {
  const colors = useAppColors()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      style={{
        minHeight: 52,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: colors.border,
      }}
    >
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.semibold,
          fontSize: 15,
          color: colors.fg,
        }}
      >
        {label}
      </Text>
      <AppIcon sf={sf} material={material} size={18} color={colors.muted} />
    </Pressable>
  )
}

export function PermissionRow({
  label,
  status,
  interactive,
  onPress,
  showDivider = false,
}: {
  label: string
  status: string
  interactive: boolean
  onPress: () => void
  showDivider?: boolean
}) {
  const colors = useAppColors()

  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !interactive }}
      accessibilityLabel={`${label}, ${status}`}
      style={{
        minHeight: 52,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: colors.border,
        opacity: interactive ? 1 : 0.92,
      }}
    >
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.regular,
          fontSize: 15,
          color: colors.fg,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: 13,
          color: colors.muted,
        }}
      >
        {status}
      </Text>
    </Pressable>
  )
}

export function ToggleRow({
  label,
  value,
  onChange,
  isLast = false,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  isLast?: boolean
}) {
  const colors = useAppColors()

  return (
    <View
      style={{
        height: 52,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.regular,
          fontSize: 15,
          color: colors.fg,
          marginRight: 12,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Toggle value={value} onValueChange={onChange} />
    </View>
  )
}

export function InfoRow({
  title,
  body,
  onPress,
  accessibilityLabel,
}: {
  title: string
  body: string
  onPress?: () => void
  accessibilityLabel?: string
}) {
  const colors = useAppColors()
  const content = (
    <>
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: 14,
          color: colors.fg,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.regular,
          fontSize: 13,
          lineHeight: 18,
          color: colors.muted,
        }}
        selectable={!onPress}
      >
        {body}
      </Text>
    </>
  )

  const style = {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as const

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        style={style}
      >
        {content}
      </Pressable>
    )
  }

  return <View style={style}>{content}</View>
}
