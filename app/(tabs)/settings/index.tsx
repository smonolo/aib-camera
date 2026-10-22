import { Camera } from 'expo-camera'
import * as Haptics from '@/lib/haptics'
import * as Linking from 'expo-linking'
import * as Location from 'expo-location'
import {
  getPermissionsAsync as getMediaLibraryPermissionsAsync,
  requestPermissionsAsync as requestMediaLibraryPermissionsAsync,
} from 'expo-media-library'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  CardGroup,
  FieldLabel,
  InfoRow,
  NavRow,
  PermissionRow,
} from '@/components/SettingsUI'
import { useToast } from '@/components/Toast'
import { copyText } from '@/lib/clipboard'
import { appVersionLabel, privacyPolicyUrl, userGuideUrl } from '@/lib/config'
import { fonts } from '@/lib/fonts'
import { useOnAppActive } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { getInstallId } from '@/lib/install-id'
import { SCREEN_PAD, tabScrollBottomPad } from '@/lib/layout'
import { ensureForegroundLocationPermission } from '@/lib/location'
import { PHOTO_GRANULAR } from '@/lib/media'
import { softVoid } from '@/lib/soft'
import { useAppColors } from '@/lib/theme'

type PermissionState = {
  granted: boolean
  canAskAgain: boolean
}

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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const colors = useAppColors()
  const copy = t()
  const { showError, showSuccess } = useToast()
  const versionLabel = appVersionLabel()
  const [installId, setInstallId] = useState<string | null>(null)
  const [cameraPermission, setCameraPermission] =
    useState<PermissionState>(INITIAL_PERMISSION)
  const [locationPermission, setLocationPermission] =
    useState<PermissionState>(INITIAL_PERMISSION)
  const [photosPermission, setPhotosPermission] =
    useState<PermissionState>(INITIAL_PERMISSION)

  const refreshPermissions = useCallback(async () => {
    await softVoid('Permission refresh failed', async () => {
      const [camera, location, photos] = await Promise.all([
        Camera.getCameraPermissionsAsync(),
        Location.getForegroundPermissionsAsync(),
        getMediaLibraryPermissionsAsync(false, [...PHOTO_GRANULAR]),
      ])
      setCameraPermission(permissionFromResponse(camera))
      setLocationPermission(permissionFromResponse(location))
      setPhotosPermission(permissionFromResponse(photos))
    })
  }, [])

  useEffect(() => {
    void refreshPermissions()
  }, [refreshPermissions])

  useOnAppActive(() => {
    void refreshPermissions()
  })

  useEffect(() => {
    let active = true
    void getInstallId().then(id => {
      if (active) setInstallId(id)
    })
    return () => {
      active = false
    }
  }, [])

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
    await softVoid('Permission action failed', async () => {
      if (state.canAskAgain) {
        await request()
        await refreshPermissions()
        return
      }
      await Linking.openSettings()
    })
  }

  const onCopy = async (value: string, successMessage: string) => {
    await Haptics.selectionAsync()
    if (await copyText(value)) showSuccess(successMessage)
    else showError(copy.settings.copyFailed, copy.settings.copyFailedBody)
  }

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-inverse"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View style={{ paddingHorizontal: SCREEN_PAD, paddingBottom: 16 }}>
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: 28,
            color: colors.fg,
            letterSpacing: -0.4,
          }}
        >
          {copy.settings.title}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: tabScrollBottomPad(insets.bottom),
          paddingHorizontal: SCREEN_PAD,
        }}
      >
        <FieldLabel color={colors.muted}>
          {copy.settings.permissions}
        </FieldLabel>
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

        <FieldLabel color={colors.muted}>{copy.settings.about}</FieldLabel>
        <CardGroup>
          <InfoRow
            title={copy.settings.versionLabel}
            body={versionLabel}
            onPress={() =>
              void onCopy(versionLabel, copy.settings.versionCopied)
            }
            accessibilityLabel={copy.settings.versionCopy}
          />
          <InfoRow
            title={copy.settings.installIdLabel}
            body={installId ?? '…'}
            onPress={
              installId
                ? () => void onCopy(installId, copy.settings.installIdCopied)
                : undefined
            }
            accessibilityLabel={copy.settings.installIdCopy}
          />
          <NavRow
            label={copy.settings.auditLogLink}
            showDivider
            onPress={() => {
              void Haptics.selectionAsync()
              router.push('/audit-log')
            }}
          />
          <NavRow
            label={copy.settings.guideLink}
            accessibilityRole="link"
            sf="arrow.up.right"
            material="open-in-new"
            showDivider
            onPress={() => {
              void (async () => {
                await Haptics.selectionAsync()
                try {
                  await WebBrowser.openBrowserAsync(userGuideUrl())
                } catch {
                  showError(
                    copy.settings.guideTitle,
                    copy.settings.guideOpenFailed
                  )
                }
              })()
            }}
          />
          <NavRow
            label={copy.settings.privacyLink}
            accessibilityRole="link"
            sf="arrow.up.right"
            material="open-in-new"
            onPress={() => {
              void (async () => {
                await Haptics.selectionAsync()
                try {
                  await WebBrowser.openBrowserAsync(privacyPolicyUrl())
                } catch {
                  showError(
                    copy.settings.privacyTitle,
                    copy.settings.privacyOpenFailed
                  )
                }
              })()
            }}
          />
        </CardGroup>
      </ScrollView>
    </View>
  )
}
