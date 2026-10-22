import * as ExpoHaptics from 'expo-haptics'

async function soft(run: () => Promise<void>): Promise<void> {
  try {
    await run()
  } catch {}
}

export async function selectionAsync(): Promise<void> {
  await soft(() => ExpoHaptics.selectionAsync())
}

export async function impactAsync(
  style: ExpoHaptics.ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle
    .Medium
): Promise<void> {
  await soft(() => ExpoHaptics.impactAsync(style))
}

export async function notificationAsync(
  type: ExpoHaptics.NotificationFeedbackType
): Promise<void> {
  await soft(() => ExpoHaptics.notificationAsync(type))
}

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType
