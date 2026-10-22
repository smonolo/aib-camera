import * as Sharing from 'expo-sharing'

import {
  auditLogCsvFilename,
  buildAuditLogCsv,
  exportAuditLogCsv,
} from '@/lib/audit-csv'
import type { AuditLogEntry } from '@/lib/types'

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}))

jest.mock('@/lib/install-id', () => ({
  getInstallId: jest.fn(
    async () => 'install-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
  ),
}))

const mockWrite = jest.fn()
const mockCreate = jest.fn()

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: jest.fn().mockImplementation((_base: unknown, name: string) => ({
    uri: `file:///cache/${name}`,
    create: mockCreate,
    write: mockWrite,
  })),
}))

const installId = 'install-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

const entries: AuditLogEntry[] = [
  {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    takenAt: '2024-07-15T14:30:45.000Z',
    lat: 45.46,
    lon: 9.19,
  },
  {
    id: 'id,with"quote',
    takenAt: '2024-07-16T10:00:00.000Z',
    lat: null,
    lon: null,
  },
]

describe('buildAuditLogCsv', () => {
  it('writes a header and RFC 4180 rows with install_id', () => {
    expect(buildAuditLogCsv(entries, installId)).toBe(
      [
        'install_id,id,taken_at,latitude,longitude',
        `${installId},aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee,2024-07-15T14:30:45.000Z,45.46,9.19`,
        `${installId},"id,with""quote",2024-07-16T10:00:00.000Z,,`,
        '',
      ].join('\n')
    )
  })

  it('emits only the header for an empty log', () => {
    expect(buildAuditLogCsv([], installId)).toBe(
      'install_id,id,taken_at,latitude,longitude\n'
    )
  })
})

describe('auditLogCsvFilename', () => {
  it('uses a stable ISO-based name', () => {
    expect(auditLogCsvFilename(new Date('2024-07-15T14:30:45.123Z'))).toBe(
      'aib-camera-capture-log-20240715T143045Z.csv'
    )
  })
})

describe('exportAuditLogCsv', () => {
  beforeEach(() => {
    mockCreate.mockClear()
    mockWrite.mockClear()
    ;(Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true)
    ;(Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined)
  })

  it('writes the CSV and opens the share sheet', async () => {
    await exportAuditLogCsv(entries)

    expect(mockCreate).toHaveBeenCalledWith({ overwrite: true })
    expect(mockWrite).toHaveBeenCalledWith(buildAuditLogCsv(entries, installId))
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      expect.stringMatching(/\.csv$/),
      expect.objectContaining({
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
      })
    )
  })

  it('rejects when the log is empty', async () => {
    await expect(exportAuditLogCsv([])).rejects.toThrow()
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
  })

  it('rejects when sharing is unavailable', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    ;(Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false)
    await expect(exportAuditLogCsv(entries)).rejects.toThrow()
    warn.mockRestore()
  })
})
