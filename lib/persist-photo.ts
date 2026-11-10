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

async function copyIntoCaptures(
  sourceUri: string,
  filename: string
): Promise<string> {
  try {
    const capturesDir = capturesDirectory()
    const outFile = new File(capturesDir, filename)
    const source = new File(sourceUri)
    const bytes = new Uint8Array(await source.arrayBuffer())
    if (!bytes.length) {
      throw new Error('Capture source is empty')
    }
    outFile.create({ overwrite: true })
    await outFile.write(bytes)
    return outFile.uri
  } catch (error) {
    warn('Capture file persist failed', error)
    throw error
  }
}

export async function persistRawPhoto(photoUri: string): Promise<string> {
  return copyIntoCaptures(photoUri, `aib-${Date.now()}.jpg`)
}

export async function persistRawVideo(videoUri: string): Promise<string> {
  return copyIntoCaptures(videoUri, `aib-${Date.now()}.mp4`)
}

export async function persistJpegCopy(
  sourceUri: string,
  prefix = 'aib-poster'
): Promise<string> {
  return copyIntoCaptures(sourceUri, `${prefix}-${Date.now()}.jpg`)
}

export function newCaptureOutputUri(extension: 'jpg' | 'png' | 'mp4'): string {
  const filename = `aib-${Date.now()}.${extension}`
  return new File(capturesDirectory(), filename).uri
}
