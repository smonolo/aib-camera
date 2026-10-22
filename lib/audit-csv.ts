import { File, Paths } from 'expo-file-system'

import { t } from './i18n'
import { getInstallId } from './install-id'
import { shareFile } from './share'
import { warn } from './soft'
import type { AuditLogEntry } from './types'

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatCoord(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return ''
  return String(value)
}

export function buildAuditLogCsv(
  entries: AuditLogEntry[],
  installId: string
): string {
  const header = 'install_id,id,taken_at,latitude,longitude'
  const rows = entries.map(entry =>
    [
      csvEscape(installId),
      csvEscape(entry.id),
      csvEscape(entry.takenAt),
      formatCoord(entry.lat),
      formatCoord(entry.lon),
    ].join(',')
  )
  return [header, ...rows].join('\n') + '\n'
}

export function auditLogCsvFilename(now = new Date()): string {
  const iso = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
  return `aib-camera-capture-log-${iso}.csv`
}

export async function exportAuditLogCsv(
  entries: AuditLogEntry[]
): Promise<void> {
  if (entries.length === 0) {
    throw new Error(t().auditLog.exportEmpty)
  }

  const installId = await getInstallId()
  const file = new File(Paths.cache, auditLogCsvFilename())
  try {
    file.create({ overwrite: true })
    file.write(buildAuditLogCsv(entries, installId))
  } catch (error) {
    warn('Audit CSV write failed', error)
    throw new Error(t().auditLog.exportUnavailable)
  }

  try {
    await shareFile(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: t().auditLog.exportDialogTitle,
      uti: 'public.comma-separated-values-text',
    })
  } catch (error) {
    warn('Share CSV failed', error)
    throw new Error(t().auditLog.exportUnavailable)
  }
}
