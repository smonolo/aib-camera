import * as Sharing from 'expo-sharing'
import { Platform, Share } from 'react-native'

import { warn } from './soft'

export type ShareFileOptions = {
  mimeType: string
  dialogTitle: string
  uti: string
  title?: string
}

export async function shareFile(
  uri: string,
  options: ShareFileOptions
): Promise<void> {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: options.mimeType,
        dialogTitle: options.dialogTitle,
        UTI: options.uti,
      })
      return
    }
  } catch (error) {
    warn('expo-sharing failed; falling back to Share', error)
  }

  await Share.share(
    Platform.OS === 'ios'
      ? { url: uri, title: options.title ?? options.dialogTitle }
      : {
          message: uri,
          title: options.title ?? options.dialogTitle,
        }
  )
}
