import Constants from 'expo-constants'
import { Platform } from 'react-native'

type Extra = {
  privacyPolicyUrl?: string
}

function extra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra
}

export function privacyPolicyUrl(): string {
  return extra().privacyPolicyUrl ?? 'https://smnl.dev/aib-camera/privacy'
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
