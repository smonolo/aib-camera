import * as Haptics from '@/lib/haptics'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconButton } from '@/components/IconButton'
import { SettingsSubscreenShell } from '@/components/SettingsUI'
import { useToast } from '@/components/Toast'
import { exportAuditLogCsv } from '@/lib/audit-csv'
import { copyText } from '@/lib/clipboard'
import { errorMessage } from '@/lib/errors'
import { fonts } from '@/lib/fonts'
import { useHapticBack } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { SCREEN_PAD } from '@/lib/layout'
import { formatLatLon, formatStampDateTime } from '@/lib/stamp'
import { loadAuditLog } from '@/lib/storage'
import { useAppColors } from '@/lib/theme'
import type { AuditLogEntry } from '@/lib/types'

export default function AuditLogScreen() {
  const insets = useSafeAreaInsets()
  const colors = useAppColors()
  const copy = t()
  const { showSuccess, showError } = useToast()
  const onBack = useHapticBack()
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null)
  const [exporting, setExporting] = useState(false)

  useFocusEffect(
    useCallback(() => {
      let active = true
      void loadAuditLog().then(list => {
        if (active) setEntries(list)
      })
      return () => {
        active = false
      }
    }, [])
  )

  const onCopy = async (id: string) => {
    await Haptics.selectionAsync()
    if (await copyText(id)) showSuccess(copy.auditLog.copied)
    else showError(copy.auditLog.copyFailed, copy.auditLog.copyFailedBody)
  }

  const onExport = async () => {
    if (!entries || entries.length === 0 || exporting) return
    setExporting(true)
    try {
      await Haptics.selectionAsync()
      await exportAuditLogCsv(entries)
    } catch (error) {
      showError(
        copy.auditLog.exportFailed,
        errorMessage(error, copy.auditLog.exportFailed)
      )
    } finally {
      setExporting(false)
    }
  }

  const canExport = entries != null && entries.length > 0 && !exporting

  return (
    <SettingsSubscreenShell
      title={copy.auditLog.title}
      backLabel={copy.photos.back}
      onBack={onBack}
      headerRight={
        <IconButton
          sf="square.and.arrow.up"
          material="ios-share"
          onPress={() => void onExport()}
          accessibilityLabel={copy.auditLog.export}
          disabled={!canExport}
        />
      }
    >
      {entries == null ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <ActivityIndicator color={colors.muted} />
        </View>
      ) : entries.length === 0 ? (
        <View
          style={{
            flex: 1,
            paddingHorizontal: SCREEN_PAD,
            paddingTop: 12,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 15,
              lineHeight: 22,
              color: colors.muted,
            }}
          >
            {copy.auditLog.empty}
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          initialNumToRender={20}
          windowSize={11}
          style={{ flex: 1 }}
          alwaysBounceVertical
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: SCREEN_PAD,
            paddingTop: 4,
            paddingBottom: insets.bottom + 24,
          }}
          ListHeaderComponent={
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 13,
                lineHeight: 18,
                color: colors.muted,
                marginBottom: 12,
              }}
            >
              {copy.auditLog.hint}
            </Text>
          }
          ItemSeparatorComponent={AuditSeparator}
          renderItem={({ item }) => (
            <AuditRow
              entry={item}
              coordsUnavailable={copy.auditLog.coordsUnavailable}
              accessibilityLabel={copy.auditLog.copyId}
              onPress={() => void onCopy(item.id)}
            />
          )}
        />
      )}
    </SettingsSubscreenShell>
  )
}

function AuditSeparator() {
  const colors = useAppColors()
  return <View style={{ height: 1, backgroundColor: colors.border }} />
}

function AuditRow({
  entry,
  coordsUnavailable,
  accessibilityLabel,
  onPress,
}: {
  entry: AuditLogEntry
  coordsUnavailable: string
  accessibilityLabel: string
  onPress: () => void
}) {
  const colors = useAppColors()
  const takenAt = formatStampDateTime(new Date(entry.takenAt), 'it-full')
  const coords =
    entry.lat != null && entry.lon != null
      ? formatLatLon(entry.lat, entry.lon)
      : coordsUnavailable

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{ paddingVertical: 14, gap: 4 }}
    >
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: 13,
          color: colors.fg,
        }}
        selectable
      >
        {entry.id}
      </Text>
      <Text
        style={{
          fontFamily: fonts.regular,
          fontSize: 14,
          color: colors.fg,
        }}
      >
        {takenAt}
      </Text>
      <Text
        style={{
          fontFamily: fonts.regular,
          fontSize: 13,
          color: colors.muted,
        }}
      >
        {coords}
      </Text>
    </Pressable>
  )
}
