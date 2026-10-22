import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { router, useFocusEffect } from 'expo-router'
import { memo, useCallback, useMemo, useState } from 'react'
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  SectionList,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/AppIcon'
import { IconButton } from '@/components/IconButton'
import { errorMessage, useToast } from '@/components/Toast'
import { fonts } from '@/lib/fonts'
import { getLocale, t } from '@/lib/i18n'
import { SCREEN_PAD_NARROW, tabScrollBottomPad } from '@/lib/layout'
import { sharePhotos } from '@/lib/media'
import { formatGalleryDayLabel, galleryDayKey } from '@/lib/stamp'
import { deleteCaptures } from '@/lib/media'
import { loadCaptures } from '@/lib/storage'
import { radii, useAppColors } from '@/lib/theme'
import type { CaptureRecord } from '@/lib/types'

const GAP = 2
const COLUMNS = 3

type PhotoRow = {
  key: string
  items: CaptureRecord[]
}

type PhotoSection = {
  title: string
  dayKey: string
  data: PhotoRow[]
}

export default function PhotosScreen() {
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  const colors = useAppColors()
  const copy = t()
  const { showError, showSuccess } = useToast()
  const [captures, setCaptures] = useState<CaptureRecord[]>([])
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState<'share' | 'delete' | null>(null)

  const tileSize =
    (windowWidth - SCREEN_PAD_NARROW * 2 - GAP * (COLUMNS - 1)) / COLUMNS

  const refresh = useCallback(async () => {
    setCaptures(await loadCaptures())
  }, [])

  useFocusEffect(
    useCallback(() => {
      void refresh()
      return () => {
        setSelecting(false)
        setSelectedIds(new Set())
      }
    }, [refresh])
  )

  const sections = useMemo(() => buildPhotoSections(captures), [captures])

  const selectedCount = selectedIds.size
  const selectedCaptures = useMemo(
    () => captures.filter(item => selectedIds.has(item.id)),
    [captures, selectedIds]
  )

  const exitSelecting = useCallback(() => {
    setSelecting(false)
    setSelectedIds(new Set())
  }, [])

  const enterSelecting = useCallback((initialId?: string) => {
    setSelecting(true)
    setSelectedIds(initialId ? new Set([initialId]) : new Set())
  }, [])

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const onShareSelected = useCallback(async () => {
    if (selectedCaptures.length === 0) return
    setBusy('share')
    try {
      await Haptics.selectionAsync()
      await sharePhotos(selectedCaptures.map(item => item.uri))
      exitSelecting()
    } catch (error) {
      showError(
        copy.photos.shareFailed,
        errorMessage(error, copy.photos.retrySoon)
      )
    } finally {
      setBusy(null)
    }
  }, [selectedCaptures, exitSelecting, showError, copy.photos])

  const confirmDeleteSelected = useCallback(() => {
    if (selectedCaptures.length === 0) return
    const count = selectedCaptures.length
    const title =
      count === 1 ? copy.photos.deleteTitle : copy.photos.deleteManyTitle
    const body =
      count === 1
        ? copy.photos.deleteBody
        : copy.photos.deleteManyBody.replace('{n}', String(count))

    Alert.alert(title, body, [
      { text: copy.photos.cancel, style: 'cancel' },
      {
        text: copy.photos.delete,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy('delete')
            try {
              await deleteCaptures(selectedCaptures.map(item => item.id))
              await refresh()
              showSuccess(
                count === 1 ? copy.photos.deleted : copy.photos.deletedMany
              )
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              )
              exitSelecting()
            } catch (error) {
              showError(
                copy.photos.deleteFailed,
                errorMessage(error, copy.photos.retrySoon)
              )
            } finally {
              setBusy(null)
            }
          })()
        },
      },
    ])
  }, [
    selectedCaptures,
    copy.photos,
    refresh,
    showSuccess,
    showError,
    exitSelecting,
  ])

  const openSelectionActions = useCallback(() => {
    if (selectedCount === 0 || busy != null) return
    void Haptics.selectionAsync()

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [copy.photos.share, copy.photos.delete, copy.photos.cancel],
          cancelButtonIndex: 2,
          destructiveButtonIndex: 1,
        },
        buttonIndex => {
          if (buttonIndex === 0) void onShareSelected()
          if (buttonIndex === 1) confirmDeleteSelected()
        }
      )
      return
    }

    Alert.alert(copy.photos.actions, undefined, [
      { text: copy.photos.cancel, style: 'cancel' },
      {
        text: copy.photos.share,
        onPress: () => void onShareSelected(),
      },
      {
        text: copy.photos.delete,
        style: 'destructive',
        onPress: confirmDeleteSelected,
      },
    ])
  }, [selectedCount, busy, copy.photos, onShareSelected, confirmDeleteSelected])

  const renderItem = useCallback(
    ({ item }: { item: PhotoRow }) => (
      <View
        style={{
          flexDirection: 'row',
          gap: GAP,
          paddingHorizontal: SCREEN_PAD_NARROW,
          marginBottom: GAP,
        }}
      >
        {item.items.map(photo => (
          <GalleryTile
            key={photo.id}
            item={photo}
            size={tileSize}
            selecting={selecting}
            selected={selectedIds.has(photo.id)}
            onOpen={() => {
              void Haptics.selectionAsync()
              router.push({
                pathname: '/photo/[id]',
                params: { id: photo.id },
              })
            }}
            onToggle={() => {
              void Haptics.selectionAsync()
              toggleSelected(photo.id)
            }}
            onLongPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              if (selecting) toggleSelected(photo.id)
              else enterSelecting(photo.id)
            }}
          />
        ))}
        {item.items.length < COLUMNS
          ? Array.from({ length: COLUMNS - item.items.length }).map((_, i) => (
              <View key={`pad-${item.key}-${i}`} style={{ width: tileSize }} />
            ))
          : null}
      </View>
    ),
    [tileSize, selecting, selectedIds, toggleSelected, enterSelecting]
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: PhotoSection }) => (
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: 15,
          color: colors.fg,
          paddingHorizontal: SCREEN_PAD_NARROW,
          paddingTop: 14,
          paddingBottom: 8,
        }}
      >
        {section.title}
      </Text>
    ),
    [colors.fg]
  )

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-inverse"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          minHeight: 40,
        }}
      >
        {selecting ? (
          <>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync()
                exitSelecting()
              }}
              hitSlop={8}
              accessibilityLabel={copy.photos.cancel}
            >
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 16,
                  color: colors.fg,
                }}
              >
                {copy.photos.cancel}
              </Text>
            </Pressable>
            <Text
              style={{
                flex: 1,
                textAlign: 'center',
                fontFamily: fonts.semibold,
                fontSize: 16,
                color: colors.fg,
              }}
            >
              {copy.photos.selectedCount.replace('{n}', String(selectedCount))}
            </Text>
            <IconButton
              sf="ellipsis.circle"
              material="more-horiz"
              onPress={openSelectionActions}
              accessibilityLabel={copy.photos.actions}
              disabled={selectedCount === 0 || busy != null}
            />
          </>
        ) : (
          <>
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.bold,
                fontSize: 28,
                color: colors.fg,
                letterSpacing: -0.4,
              }}
            >
              {copy.photos.title}
            </Text>
            {captures.length > 0 ? (
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync()
                  enterSelecting()
                }}
                hitSlop={8}
                accessibilityLabel={copy.photos.select}
              >
                <Text
                  style={{
                    fontFamily: fonts.semibold,
                    fontSize: 16,
                    color: colors.fg,
                  }}
                >
                  {copy.photos.select}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.key}
        stickySectionHeadersEnabled={false}
        initialNumToRender={12}
        windowSize={9}
        removeClippedSubviews
        contentContainerStyle={{
          paddingBottom: tabScrollBottomPad(insets.bottom),
          flexGrow: 1,
        }}
        ListEmptyComponent={<GalleryEmpty />}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
      />
    </View>
  )
}

const GalleryTile = memo(function GalleryTile({
  item,
  size,
  selecting,
  selected,
  onOpen,
  onToggle,
  onLongPress,
}: {
  item: CaptureRecord
  size: number
  selecting: boolean
  selected: boolean
  onOpen: () => void
  onToggle: () => void
  onLongPress: () => void
}) {
  const colors = useAppColors()

  return (
    <Pressable
      onPress={selecting ? onToggle : onOpen}
      onLongPress={onLongPress}
      delayLongPress={280}
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        backgroundColor: colors.surfaceMuted,
      }}
    >
      <Image
        source={{ uri: item.uri }}
        recyclingKey={item.id}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
      />
      {selecting ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: radii.full,
            borderWidth: 2,
            borderColor: '#FFFFFF',
            backgroundColor: selected ? '#007AFF' : 'rgba(0,0,0,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? (
            <AppIcon
              sf="checkmark"
              material="check"
              size={12}
              color="#FFFFFF"
            />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  )
})

function GalleryEmpty() {
  const colors = useAppColors()
  const copy = t()

  return (
    <View
      style={{
        alignItems: 'center',
        paddingTop: 96,
        paddingHorizontal: 32,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radii.md,
          marginBottom: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceMuted,
        }}
      >
        <AppIcon sf="photo" material="photo" size={26} color={colors.fg} />
      </View>
      <Text
        style={{
          fontFamily: fonts.regular,
          fontSize: 15,
          lineHeight: 22,
          color: colors.muted,
          textAlign: 'center',
        }}
      >
        {copy.photos.emptyHint}
      </Text>
    </View>
  )
}

function buildPhotoSections(captures: CaptureRecord[]): PhotoSection[] {
  const copy = t()
  const locale = getLocale()
  const groups = new Map<string, CaptureRecord[]>()

  for (const capture of captures) {
    const key = galleryDayKey(capture.takenAt)
    const list = groups.get(key)
    if (list) list.push(capture)
    else groups.set(key, [capture])
  }

  return [...groups.entries()].map(([dayKey, items]) => ({
    dayKey,
    title: formatGalleryDayLabel(
      dayKey,
      { today: copy.photos.today, yesterday: copy.photos.yesterday },
      locale
    ),
    data: chunkRows(items, dayKey),
  }))
}

function chunkRows(items: CaptureRecord[], dayKey: string): PhotoRow[] {
  const rows: PhotoRow[] = []
  for (let i = 0; i < items.length; i += COLUMNS) {
    const slice = items.slice(i, i + COLUMNS)
    rows.push({
      key: `${dayKey}-${i}`,
      items: slice,
    })
  }
  return rows
}
