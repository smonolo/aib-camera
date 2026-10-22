import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { router, useFocusEffect } from 'expo-router'
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
import { useToast } from '@/components/Toast'
import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { SCREEN_PAD, SCREEN_PAD_NARROW } from '@/lib/layout'
import { formatLatLon, formatStampDateTime } from '@/lib/stamp'
import { loadAuditLog } from '@/lib/storage'
import { useAppColors } from '@/lib/theme'
import type { AuditLogEntry } from '@/lib/types'

export default function AuditLogScreen() {
  const insets = useSafeAreaInsets()
  const colors = useAppColors()
  const copy = t()
  const { showSuccess } = useToast()
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null)

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
    await Clipboard.setStringAsync(id)
    showSuccess(copy.auditLog.copied)
  }

  const onBack = () => {
    void Haptics.selectionAsync()
    router.back()
  }

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-inverse"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View
        style={{
          paddingHorizontal: SCREEN_PAD_NARROW,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <IconButton
          sf="chevron.backward"
          material="arrow-back"
          onPress={onBack}
          accessibilityLabel={copy.photos.back}
        />
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.semibold,
            fontSize: 17,
            color: colors.fg,
          }}
          numberOfLines={1}
        >
          {copy.auditLog.title}
        </Text>
      </View>

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
          contentContainerStyle={{
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
    </View>
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
