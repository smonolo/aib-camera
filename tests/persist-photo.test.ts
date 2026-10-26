const mockCreate = jest.fn()
const mockWrite = jest.fn()
const mockArrayBuffer = jest.fn()
const mockDirCreate = jest.fn()

jest.mock('expo-file-system', () => {
  class MockDirectory {
    uri: string
    exists = false
    create = mockDirCreate
    constructor(...parts: unknown[]) {
      this.uri = parts.map(String).join('/')
    }
  }

  class MockFile {
    uri: string
    create = mockCreate
    write = mockWrite
    arrayBuffer = mockArrayBuffer
    constructor(...parts: unknown[]) {
      if (parts.length === 1 && typeof parts[0] === 'string') {
        this.uri = parts[0]
        return
      }
      const base = parts[0] as { uri?: string } | string
      const baseUri = typeof base === 'string' ? base : (base?.uri ?? '')
      this.uri = `${baseUri}/${String(parts[1])}`
    }
  }

  return {
    Paths: { document: 'file:///document' },
    Directory: MockDirectory,
    File: MockFile,
  }
})

import { capturesDirectory, persistRawPhoto } from '@/lib/persist-photo'

describe('capturesDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDirCreate.mockReset()
  })

  it('creates the captures folder when missing', () => {
    const dir = capturesDirectory()
    expect(dir.uri).toContain('captures')
    expect(mockDirCreate).toHaveBeenCalledWith({
      intermediates: true,
      idempotent: true,
    })
  })

  it('still returns the directory when create fails', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockDirCreate.mockImplementationOnce(() => {
      throw new Error('mkdir failed')
    })
    const dir = capturesDirectory()
    expect(dir.uri).toContain('captures')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('persistRawPhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDirCreate.mockReset()
    mockArrayBuffer.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer)
    mockWrite.mockResolvedValue(undefined)
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('copies bytes into the captures directory', async () => {
    const uri = await persistRawPhoto('file:///tmp/camera.jpg')
    expect(mockArrayBuffer).toHaveBeenCalled()
    expect(mockCreate).toHaveBeenCalledWith({ overwrite: true })
    expect(mockWrite).toHaveBeenCalled()
    expect(uri).toContain('aib-1700000000000.jpg')
  })

  it('returns the original URI when copy fails', async () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockArrayBuffer.mockRejectedValue(new Error('read failed'))
    await expect(persistRawPhoto('file:///tmp/camera.jpg')).resolves.toBe(
      'file:///tmp/camera.jpg'
    )
    expect(spy).toHaveBeenCalled()
  })
})
