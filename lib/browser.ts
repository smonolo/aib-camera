import * as WebBrowser from 'expo-web-browser'

export async function openExternalUrl(url: string): Promise<boolean> {
  try {
    await WebBrowser.openBrowserAsync(url)
    return true
  } catch {
    return false
  }
}
