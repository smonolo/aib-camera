import * as Crypto from 'expo-crypto'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

export const APP_NAME = 'AIB Camera'

type Extra = {
  privacyPolicyUrl?: string
  userGuideUrl?: string
}

function extra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra
}

export function privacyPolicyUrl(): string {
  return extra().privacyPolicyUrl ?? 'https://smnl.dev/aib-camera/privacy'
}

export function userGuideUrl(): string {
  return extra().userGuideUrl ?? 'https://smnl.dev/aib-camera/guida'
}

export function appVersionLabel(): string {
  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0'
  const build =
    Platform.OS === 'ios'
      ? (Constants.expoConfig?.ios?.buildNumber ?? Constants.nativeBuildVersion)
      : Platform.OS === 'android'
        ? (Constants.expoConfig?.android?.versionCode?.toString() ??
          Constants.nativeBuildVersion)
        : null
  return build ? `${version} (${build})` : version
}

export function newCaptureId(): string {
  return Crypto.randomUUID()
}
