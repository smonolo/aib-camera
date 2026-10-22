import { Camera } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import * as Linking from 'expo-linking'
import * as Location from 'expo-location'
import {
  getPermissionsAsync as getMediaLibraryPermissionsAsync,
  requestPermissionsAsync as requestMediaLibraryPermissionsAsync,
} from 'expo-media-library'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  CardGroup,
  PermissionRow,
  SettingsSubscreenShell,
} from '@/components/SettingsUI'
import { useOnAppActive } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { SCREEN_PAD, tabScrollBottomPad } from '@/lib/layout'
import { ensureForegroundLocationPermission } from '@/lib/location'

type PermissionState = {
  granted: boolean
  canAskAgain: boolean
}

const PHOTO_GRANULAR = ['photo'] as const

const INITIAL_PERMISSION: PermissionState = {
  granted: false,
  canAskAgain: true,
}

function permissionFromResponse(result: {
  granted: boolean
  canAskAgain: boolean
}): PermissionState {
  return {
    granted: result.granted,
    canAskAgain: result.granted || result.canAskAgain,
  }
}

export default function SettingsPermissionsScreen() {
  const insets = useSafeAreaInsets()
  const copy = t()
  const [cameraPermission, setCameraPermission] =
    useState<PermissionState>(INITIAL_PERMISSION)
  const [locationPermission, setLocationPermission] =
    useState<PermissionState>(INITIAL_PERMISSION)
  const [photosPermission, setPhotosPermission] =
    useState<PermissionState>(INITIAL_PERMISSION)

  const refreshPermissions = useCallback(async () => {
    const [camera, location, photos] = await Promise.all([
      Camera.getCameraPermissionsAsync(),
      Location.getForegroundPermissionsAsync(),
      getMediaLibraryPermissionsAsync(false, [...PHOTO_GRANULAR]),
    ])
    setCameraPermission(permissionFromResponse(camera))
    setLocationPermission(permissionFromResponse(location))
    setPhotosPermission(permissionFromResponse(photos))
  }, [])

  useEffect(() => {
    void refreshPermissions()
  }, [refreshPermissions])

  useOnAppActive(() => {
    void refreshPermissions()
  })

  const permissionStatusLabel = (state: PermissionState) => {
    if (state.granted) return copy.settings.permissionAllowed
    if (state.canAskAgain) return copy.settings.permissionAsk
    return copy.settings.permissionOpenSettings
  }

  const onPermissionPress = async (
    state: PermissionState,
    request: () => Promise<unknown>
  ) => {
    await Haptics.selectionAsync()
    if (state.granted) return
    if (state.canAskAgain) {
      await request()
      await refreshPermissions()
      return
    }
    await Linking.openSettings()
  }

  const onBack = () => {
    void Haptics.selectionAsync()
    router.back()
  }

  return (
    <SettingsSubscreenShell
      title={copy.settings.permissions}
      backLabel={copy.photos.back}
      onBack={onBack}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PAD,
          paddingBottom: tabScrollBottomPad(insets.bottom),
        }}
      >
        <CardGroup>
          <PermissionRow
            label={copy.settings.cameraPermission}
            status={permissionStatusLabel(cameraPermission)}
            interactive={!cameraPermission.granted}
            showDivider
            onPress={() =>
              void onPermissionPress(cameraPermission, () =>
                Camera.requestCameraPermissionsAsync()
              )
            }
          />
          <PermissionRow
            label={copy.settings.locationPermission}
            status={permissionStatusLabel(locationPermission)}
            interactive={!locationPermission.granted}
            showDivider
            onPress={() =>
              void onPermissionPress(locationPermission, () =>
                ensureForegroundLocationPermission()
              )
            }
          />
          <PermissionRow
            label={copy.settings.photosPermission}
            status={permissionStatusLabel(photosPermission)}
            interactive={!photosPermission.granted}
            onPress={() =>
              void onPermissionPress(photosPermission, () =>
                requestMediaLibraryPermissionsAsync(false, [...PHOTO_GRANULAR])
              )
            }
          />
        </CardGroup>
      </ScrollView>
    </SettingsSubscreenShell>
  )
}
