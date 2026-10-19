import { useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import * as Location from 'expo-location'
import { useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/AppIcon'
import { AppMark } from '@/components/AppMark'
import { GlassButton } from '@/components/GlassButton'
import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { ensureForegroundLocationPermission } from '@/lib/location'
import { useAppColors } from '@/lib/theme'

type Props = {
  children: ReactNode
}

type LocationState = 'unknown' | 'undetermined' | 'granted' | 'denied'

export function PermissionGate({ children }: Props) {
  const insets = useSafeAreaInsets()
  const colors = useAppColors()
  const copy = t()
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [locationState, setLocationState] = useState<LocationState>('unknown')
  const [busy, setBusy] = useState(false)
  const [skipLocation, setSkipLocation] = useState(false)

  useEffect(() => {
    void Location.getForegroundPermissionsAsync().then(result => {
      if (result.granted) {
        setLocationState('granted')
        return
      }
      if (result.status === Location.PermissionStatus.UNDETERMINED) {
        setLocationState('undetermined')
        return
      }
      setLocationState('denied')
    })
  }, [])

  const cameraReady = Boolean(cameraPermission?.granted)
  const locationReady = locationState === 'granted'
  const checking = cameraPermission == null || locationState === 'unknown'

  const canEnterCamera =
    cameraReady && (locationReady || locationState === 'denied' || skipLocation)

  if (canEnterCamera) {
    return <>{children}</>
  }

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-canvas-inverse">
        <ActivityIndicator color={colors.fg} />
      </View>
    )
  }

  const requestAll = async () => {
    setBusy(true)
    await Haptics.selectionAsync()
    try {
      if (!cameraReady) await requestCameraPermission()
      const loc = await ensureForegroundLocationPermission()
      setLocationState(loc ? 'granted' : 'denied')
      if (!loc) setSkipLocation(true)
    } finally {
      setBusy(false)
    }
  }

  const continueWithoutGps = async () => {
    await Haptics.selectionAsync()
    if (!cameraReady) {
      setBusy(true)
      try {
        await requestCameraPermission()
      } finally {
        setBusy(false)
      }
    }
    setSkipLocation(true)
  }

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-inverse"
      style={{
        paddingTop: insets.top + 28,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 20,
      }}
    >
      <AppMark size="medium" showTitle={false} />
      <Text
        style={{
          fontFamily: fonts.bold,
          fontSize: 28,
          color: colors.fg,
          letterSpacing: -0.4,
          marginTop: 20,
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
          ok={cameraReady}
        />
        <StatusRow
          label={copy.permissions.location}
          iconSf="location"
          iconMaterial="my-location"
          ok={locationReady}
          pending={locationState === 'undetermined'}
          optional
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
        {copy.permissions.locationOptionalHint}
      </Text>

      <View style={{ flex: 1 }} />

      <View style={{ gap: 10 }}>
        <GlassButton
          label={copy.permissions.continue}
          onPress={requestAll}
          loading={busy}
          disabled={busy}
        />
        {cameraReady ? (
          <Pressable
            onPress={continueWithoutGps}
            disabled={busy}
            accessibilityLabel={copy.permissions.continueWithoutLocation}
            style={{
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: fonts.semibold,
                fontSize: 15,
                color: colors.muted,
              }}
            >
              {copy.permissions.continueWithoutLocation}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function StatusRow({
  label,
  iconSf,
  iconMaterial,
  ok,
  pending,
  optional,
}: {
  label: string
  iconSf: 'camera' | 'location'
  iconMaterial: 'photo-camera' | 'my-location'
  ok: boolean
  pending?: boolean
  optional?: boolean
}) {
  const colors = useAppColors()
  const copy = t()
  const value = ok
    ? copy.permissions.granted
    : pending
      ? copy.permissions.needed
      : optional
        ? copy.permissions.optional
        : copy.permissions.denied

  return (
    <View
      style={{
        minHeight: 52,
        borderRadius: 14,
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
          sf={iconSf === 'camera' ? 'camera' : 'location'}
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
        }}
      >
        {value}
      </Text>
    </View>
  )
}
