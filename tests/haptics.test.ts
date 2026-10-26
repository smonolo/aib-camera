import * as ExpoHaptics from 'expo-haptics'

import * as Haptics from '@/lib/haptics'

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium', Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}))

describe('haptics soft wrappers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('forwards selection / impact / notification calls', async () => {
    ;(ExpoHaptics.selectionAsync as jest.Mock).mockResolvedValue(undefined)
    ;(ExpoHaptics.impactAsync as jest.Mock).mockResolvedValue(undefined)
    ;(ExpoHaptics.notificationAsync as jest.Mock).mockResolvedValue(undefined)

    await Haptics.selectionAsync()
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    expect(ExpoHaptics.selectionAsync).toHaveBeenCalled()
    expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith('medium')
    expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith('success')
  })

  it('swallows native haptic failures', async () => {
    ;(ExpoHaptics.selectionAsync as jest.Mock).mockRejectedValue(
      new Error('no haptics')
    )
    ;(ExpoHaptics.impactAsync as jest.Mock).mockRejectedValue(
      new Error('no haptics')
    )
    ;(ExpoHaptics.notificationAsync as jest.Mock).mockRejectedValue(
      new Error('no haptics')
    )

    await expect(Haptics.selectionAsync()).resolves.toBeUndefined()
    await expect(
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    ).resolves.toBeUndefined()
    await expect(
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    ).resolves.toBeUndefined()
  })
})
