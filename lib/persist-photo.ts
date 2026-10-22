import { Directory, File, Paths } from 'expo-file-system'

import { warn } from './soft'

export function capturesDirectory(): Directory {
  const capturesDir = new Directory(Paths.document, 'captures')
  try {
    if (!capturesDir.exists) {
      capturesDir.create({ intermediates: true, idempotent: true })
    }
  } catch (error) {
    warn('Captures directory create failed', error)
  }
  return capturesDir
}

export async function persistRawPhoto(photoUri: string): Promise<string> {
  try {
    const capturesDir = capturesDirectory()
    const filename = `aib-${Date.now()}.jpg`
    const outFile = new File(capturesDir, filename)
    const source = new File(photoUri)
    const bytes = new Uint8Array(await source.arrayBuffer())
    outFile.create({ overwrite: true })
    outFile.write(bytes)
    return outFile.uri
  } catch (error) {
    warn('Raw photo persist failed; returning original URI', error)
    return photoUri
  }
}
