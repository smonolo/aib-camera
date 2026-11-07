import { File, Paths } from 'expo-file-system'

export function decodeDataUrlBase64(dataUrl: string): Uint8Array {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(dataUrl)
  const base64 = match?.[1]
  if (!base64) throw new Error('Invalid image data URL')

  const atobFn = globalThis.atob
  if (typeof atobFn !== 'function') throw new Error('atob unavailable')

  const binary = atobFn(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function writeJpegDataUrl(dataUrl: string): Promise<string> {
  const bytes = decodeDataUrlBase64(dataUrl)
  const file = new File(Paths.cache, `aib-map-${Date.now()}.jpg`)
  file.create({ overwrite: true })
  await file.write(bytes)
  return file.uri
}
