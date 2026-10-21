import { useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import * as Linking from 'expo-linking'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/AppIcon'
import { Button } from '@/components/Button'
import { fonts } from '@/lib/fonts'
import { useOnAppActive } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { radii, useAppColors } from '@/lib/theme'

type Props = {
  children: ReactNode
}

export function PermissionGate({ children }: Props) {
  const insets = useSafeAreaInsets()
  const colors = useAppColors()
  const copy = t()
  const [cameraPermission, requestCameraPermission, getCameraPermission] =
    useCameraPermissions()
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const autoRequested = useRef(false)

  const refreshCamera = useCallback(async () => {
    await getCameraPermission()
  }, [getCameraPermission])

  useOnAppActive(() => {
    void refreshCamera()
  })

  const cameraReady = Boolean(cameraPermission?.granted)
  const cameraStatus = cameraPermission?.status
  const canAskCamera = cameraPermission?.canAskAgain !== false
  const cameraBlocked = Boolean(
    cameraPermission &&
    !cameraPermission.granted &&
    cameraPermission.status === 'denied' &&
    !cameraPermission.canAskAgain
  )
  const checking = cameraPermission == null

  const requestCamera = useCallback(async () => {
    setBusy(true)
    setHint(null)
    await Haptics.selectionAsync()
    try {
      if (cameraBlocked) {
        setHint(copy.permissions.cameraBlockedHint)
        await Linking.openSettings()
        return
      }
      const result = await requestCameraPermission()
      if (result.granted) {
        setHint(null)
        return
      }
      if (!result.canAskAgain) {
        setHint(copy.permissions.cameraBlockedHint)
      } else {
        setHint(copy.permissions.cameraDeniedHint)
      }
    } finally {
      setBusy(false)
      await refreshCamera()
    }
  }, [
    cameraBlocked,
    copy.permissions.cameraBlockedHint,
    copy.permissions.cameraDeniedHint,
    requestCameraPermission,
    refreshCamera,
  ])

  useEffect(() => {
    if (checking || cameraReady || autoRequested.current) return
    if (cameraPermission?.status === 'undetermined' || canAskCamera) {
      autoRequested.current = true
      void requestCamera()
    }
  }, [
    checking,
    cameraReady,
    cameraPermission?.status,
    canAskCamera,
    requestCamera,
  ])

  if (cameraReady) {
    return <>{children}</>
  }

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-canvas-inverse">
        <ActivityIndicator color={colors.fg} />
      </View>
    )
  }

  const primaryLabel = cameraBlocked
    ? copy.permissions.openSettings
    : copy.permissions.continue

  const statusLabel =
    cameraStatus === 'undetermined'
      ? copy.permissions.needed
      : cameraBlocked
        ? copy.permissions.blocked
        : copy.permissions.denied

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-inverse"
      style={{
        paddingTop: insets.top + 28,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 20,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bold,
          fontSize: 28,
          color: colors.fg,
          letterSpacing: -0.4,
        }}
      >
        {copy.permissions.title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.regular,
          fontSize: 15,
          lineHeight: 22,
          color: colors.muted,
          marginTop: 10,
        }}
      >
        {copy.permissions.body}
      </Text>

      <View style={{ marginTop: 28, gap: 8 }}>
        <StatusRow
          label={copy.permissions.camera}
          iconSf="camera"
          iconMaterial="photo-camera"
          value={statusLabel}
        />
        <StatusRow
          label={copy.permissions.location}
          iconSf="location"
          iconMaterial="my-location"
          value={copy.permissions.optionalLater}
        />
      </View>

      <Text
        style={{
          fontFamily: fonts.regular,
          fontSize: 13,
          lineHeight: 18,
          color: colors.muted,
          marginTop: 14,
        }}
      >
        {hint ??
          (cameraBlocked
            ? copy.permissions.cameraBlockedHint
            : copy.permissions.locationOptionalHint)}
      </Text>

      <View style={{ flex: 1 }} />

      <Button
        label={primaryLabel}
        onPress={() => void requestCamera()}
        loading={busy}
        disabled={busy}
      />
    </View>
  )
}

function StatusRow({
  label,
  iconSf,
  iconMaterial,
  value,
}: {
  label: string
  iconSf: 'camera' | 'location'
  iconMaterial: 'photo-camera' | 'my-location'
  value: string
}) {
  const colors = useAppColors()

  return (
    <View
      style={{
        minHeight: 52,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          flex: 1,
        }}
      >
        <AppIcon
          sf={iconSf}
          material={iconMaterial}
          size={20}
          color={colors.muted}
        />
        <Text
          style={{
            fontFamily: fonts.medium,
            fontSize: 15,
            color: colors.fg,
            flexShrink: 1,
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: 13,
          color: colors.muted,
          marginLeft: 8,
          flexShrink: 0,
        }}
      >
        {value}
      </Text>
    </View>
  )
}
