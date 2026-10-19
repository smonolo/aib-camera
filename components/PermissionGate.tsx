import { useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import * as Location from 'expo-location'
import { useEffect, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/AppIcon'
import { AppMark } from '@/components/AppMark'
import { GlassSurface } from '@/components/GlassSurface'
import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { ensureForegroundLocationPermission } from '@/lib/location'

type Props = {
  children: ReactNode
}

export function PermissionGate({ children }: Props) {
  const insets = useSafeAreaInsets()
  const scheme = useColorScheme()
  const fg = scheme === 'dark' ? '#FAFAFA' : '#171717'
  const muted = scheme === 'dark' ? '#A3A3A3' : '#525252'
  const surface = scheme === 'dark' ? '#1A1A1A' : '#FFFFFF'
  const copy = t()
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void Location.getForegroundPermissionsAsync().then(result => {
      setLocationGranted(result.granted)
    })
  }, [])

  const cameraReady = Boolean(cameraPermission?.granted)
  const locationReady = locationGranted === true
  const checking = cameraPermission == null || locationGranted === null

  if (cameraReady && locationReady) {
    return <>{children}</>
  }

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-canvas-inverse">
        <ActivityIndicator color={fg} />
      </View>
    )
  }

  const requestAll = async () => {
    setBusy(true)
    await Haptics.selectionAsync()
    try {
      if (!cameraReady) await requestCameraPermission()
      const loc = await ensureForegroundLocationPermission()
      setLocationGranted(loc)
    } finally {
      setBusy(false)
    }
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
          color: fg,
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
          color: muted,
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
          fg={fg}
          muted={muted}
          surface={surface}
        />
        <StatusRow
          label={copy.permissions.location}
          iconSf="location"
          iconMaterial="my-location"
          ok={locationReady}
          pending={locationGranted === null && !busy}
          fg={fg}
          muted={muted}
          surface={surface}
        />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ borderRadius: 16, overflow: 'hidden' }}>
        <GlassSurface interactive style={{ borderRadius: 16 }}>
          <Pressable
            onPress={requestAll}
            disabled={busy}
            style={{
              minHeight: 52,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {busy ? (
              <ActivityIndicator color={fg} />
            ) : (
              <Text
                style={{ fontFamily: fonts.semibold, fontSize: 16, color: fg }}
              >
                {copy.permissions.continue}
              </Text>
            )}
          </Pressable>
        </GlassSurface>
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
  fg,
  muted,
  surface,
}: {
  label: string
  iconSf: 'camera' | 'location'
  iconMaterial: 'photo-camera' | 'my-location'
  ok: boolean
  pending?: boolean
  fg: string
  muted: string
  surface: string
}) {
  const copy = t()
  const value = ok
    ? copy.permissions.granted
    : pending
      ? copy.permissions.needed
      : copy.permissions.denied

  return (
    <View
      style={{
        minHeight: 52,
        borderRadius: 14,
        backgroundColor: surface,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <AppIcon
          sf={iconSf === 'camera' ? 'camera' : 'location'}
          material={iconMaterial}
          size={20}
          color={muted}
        />
        <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: fg }}>
          {label}
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: muted }}>
        {value}
      </Text>
    </View>
  )
}
