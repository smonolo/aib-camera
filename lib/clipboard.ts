import * as Clipboard from 'expo-clipboard'

import { warn } from './soft'

export async function copyText(value: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(value)
    return true
  } catch (error) {
    warn('Clipboard copy failed', error)
    return false
  }
}
