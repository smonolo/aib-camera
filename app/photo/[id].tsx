import * as Haptics from '@/lib/haptics'
import { Image } from 'expo-image'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useVideoPlayer, VideoView } from 'expo-video'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { useToast } from '@/components/Toast'
import { errorMessage } from '@/lib/errors'
import { fonts } from '@/lib/fonts'
import { useHapticBack } from '@/lib/hooks'
import { useI18n } from '@/lib/i18n/locale-context'
import {
  actionButtonLayoutStyle,
  PHOTO_STRIP,
  SCREEN_HEADER_TOP_GAP,
  SCREEN_PAD,
  screenEdgePad,
} from '@/lib/layout'
import { sortCapturesNewestFirst } from '@/lib/gallery'
import { capturePreviewUri, deleteCaptures, shareCaptures } from '@/lib/media'
import { loadCaptures } from '@/lib/storage'
import { radii, useAppColors } from '@/lib/theme'
import type { CaptureRecord } from '@/lib/types'

function formatViewerLabel(template: string, n: number, total: number): string {
  return template.replace('{n}', String(n)).replace('{total}', String(total))
}

const PagerVideo = memo(function PagerVideo({
  uri,
  active,
}: {
  uri: string
  active: boolean
}) {
  const player = useVideoPlayer(uri, instance => {
    instance.loop = true
  })

  useEffect(() => {
    if (active) {
      player.play()
    } else {
      player.pause()
    }
  }, [active, player])

  return (
    <VideoView
      player={player}
      style={{ flex: 1, borderRadius: radii.sm }}
      contentFit="contain"
      nativeControls
    />
  )
})

const PagerPage = memo(function PagerPage({
  item,
  active,
  width,
  padLeft,
  padRight,
}: {
  item: CaptureRecord
  active: boolean
  width: number
  padLeft: number
  padRight: number
}) {
  return (
    <View
      style={{
        width,
        paddingLeft: padLeft,
        paddingRight: padRight,
      }}
    >
      {item.kind === 'video' ? (
        <PagerVideo uri={item.uri} active={active} />
      ) : (
        <Image
          source={{ uri: item.uri }}
          recyclingKey={item.id}
          style={{ flex: 1, borderRadius: radii.sm }}
          contentFit="contain"
        />
      )}
    </View>
  )
})

const StripThumb = memo(function StripThumb({
  uri,
  id,
  index,
  selected,
  isLast,
  accessibilityLabel,
  borderColor,
  mutedColor,
  onSelect,
}: {
  uri: string
  id: string
  index: number
  selected: boolean
  isLast: boolean
  accessibilityLabel: string
  borderColor: string
  mutedColor: string
  onSelect: (index: number) => void
}) {
  return (
    <Pressable
      onPress={() => onSelect(index)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      style={{
        width: PHOTO_STRIP.thumb,
        height: PHOTO_STRIP.thumb,
        marginRight: isLast ? 0 : PHOTO_STRIP.gap,
        borderRadius: PHOTO_STRIP.radius,
        overflow: 'hidden',
        borderWidth: selected ? PHOTO_STRIP.selectedBorder : 0,
        borderColor,
        opacity: selected ? 1 : 0.55,
        backgroundColor: mutedColor,
      }}
    >
      <Image
        source={{ uri }}
        recyclingKey={`strip-${id}`}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
      />
    </Pressable>
  )
})

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const landscape = width > height
  const colors = useAppColors()
  const { copy } = useI18n()
  const { showError, showSuccess } = useToast()
  const onBack = useHapticBack()
  const padLeft = screenEdgePad(insets.left, SCREEN_PAD)
  const padRight = screenEdgePad(insets.right, SCREEN_PAD)

  const [photos, setPhotos] = useState<CaptureRecord[] | undefined>(undefined)
  const [index, setIndex] = useState(0)
  const pagerRef = useRef<FlatList<CaptureRecord>>(null)
  const stripRef = useRef<FlatList<CaptureRecord>>(null)
  const indexRef = useRef(0)
  const ignorePagerSync = useRef(false)
  const photosRef = useRef<CaptureRecord[] | undefined>(undefined)

  const openId = String(id)

  useFocusEffect(
    useCallback(() => {
      let active = true
      void loadCaptures().then(list => {
        if (!active) return
        const ordered = sortCapturesNewestFirst(list)
        photosRef.current = ordered
        setPhotos(ordered)
        const found = ordered.findIndex(item => item.id === openId)
        const next = found >= 0 ? found : 0
        indexRef.current = next
        setIndex(next)
        requestAnimationFrame(() => {
          if (!active) return
          ignorePagerSync.current = true
          pagerRef.current?.scrollToIndex({ index: next, animated: false })
          stripRef.current?.scrollToIndex({
            index: next,
            animated: false,
            viewPosition: 0.5,
          })
          requestAnimationFrame(() => {
            ignorePagerSync.current = false
          })
        })
      })
      return () => {
        active = false
      }
    }, [openId])
  )

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  const photo = photos?.[index] ?? null
  const selectedId = photo?.id ?? null
  const photoCount = photos?.length ?? 0

  const goTo = useCallback(
    (
      next: number,
      source: 'pager' | 'strip' | 'delete',
      list?: CaptureRecord[]
    ) => {
      const items = list ?? photosRef.current
      if (!items || next < 0 || next >= items.length) return
      if (next === indexRef.current && source !== 'delete') return

      indexRef.current = next
      setIndex(next)

      if (source !== 'pager') {
        ignorePagerSync.current = true
        pagerRef.current?.scrollToIndex({
          index: next,
          animated: source !== 'delete',
        })
        requestAnimationFrame(() => {
          ignorePagerSync.current = false
        })
      }

      stripRef.current?.scrollToIndex({
        index: next,
        animated: source !== 'delete',
        viewPosition: 0.5,
      })

      if (source !== 'delete') {
        void Haptics.selectionAsync()
      }
    },
    []
  )

  const onPagerScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (ignorePagerSync.current) return
      const items = photosRef.current
      if (!items?.length) return
      const next = Math.round(event.nativeEvent.contentOffset.x / width)
      if (next === indexRef.current) return
      if (next < 0 || next >= items.length) return
      goTo(next, 'pager')
    },
    [goTo, width]
  )

  const onShare = useCallback(async () => {
    const current = photosRef.current?.[indexRef.current]
    if (!current) return
    try {
      await Haptics.selectionAsync()
      await shareCaptures([current])
    } catch (error) {
      showError(
        copy.photos.shareFailed,
        errorMessage(error, copy.photos.retrySoon)
      )
    }
  }, [copy.photos.retrySoon, copy.photos.shareFailed, showError])

  const onDelete = useCallback(() => {
    const current = photosRef.current?.[indexRef.current]
    if (!current) return
    const isVideo = current.kind === 'video'
    Alert.alert(
      isVideo ? copy.photos.deleteVideoTitle : copy.photos.deleteTitle,
      isVideo ? copy.photos.deleteVideoBody : copy.photos.deleteBody,
      [
        { text: copy.photos.cancel, style: 'cancel' },
        {
          text: copy.photos.delete,
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const remaining = await deleteCaptures([current.id])
                showSuccess(copy.photos.deleted)
                await Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                )
                if (remaining.length === 0) {
                  router.back()
                  return
                }
                const nextIndex = Math.min(
                  indexRef.current,
                  remaining.length - 1
                )
                photosRef.current = remaining
                setPhotos(remaining)
                goTo(nextIndex, 'delete', remaining)
              } catch (error) {
                showError(
                  copy.photos.deleteFailed,
                  errorMessage(error, copy.photos.retrySoon)
                )
              }
            })()
          },
        },
      ]
    )
  }, [
    copy.photos.cancel,
    copy.photos.delete,
    copy.photos.deleteBody,
    copy.photos.deleteFailed,
    copy.photos.deleteTitle,
    copy.photos.deleteVideoBody,
    copy.photos.deleteVideoTitle,
    copy.photos.deleted,
    copy.photos.retrySoon,
    goTo,
    showError,
    showSuccess,
  ])

  const stripGetItemLayout = useCallback(
    (_: ArrayLike<CaptureRecord> | null | undefined, itemIndex: number) => ({
      length: PHOTO_STRIP.thumb + PHOTO_STRIP.gap,
      offset: itemIndex * (PHOTO_STRIP.thumb + PHOTO_STRIP.gap),
      index: itemIndex,
    }),
    []
  )

  const pagerGetItemLayout = useCallback(
    (_: ArrayLike<CaptureRecord> | null | undefined, itemIndex: number) => ({
      length: width,
      offset: itemIndex * width,
      index: itemIndex,
    }),
    [width]
  )

  const renderPagerItem = useCallback<ListRenderItem<CaptureRecord>>(
    ({ item }) => (
      <PagerPage
        item={item}
        active={item.id === selectedId}
        width={width}
        padLeft={padLeft}
        padRight={padRight}
      />
    ),
    [padLeft, padRight, selectedId, width]
  )

  const onSelectStrip = useCallback(
    (itemIndex: number) => {
      goTo(itemIndex, 'strip')
    },
    [goTo]
  )

  const renderStripItem = useCallback<ListRenderItem<CaptureRecord>>(
    ({ item, index: itemIndex }) => (
      <StripThumb
        uri={capturePreviewUri(item)}
        id={item.id}
        index={itemIndex}
        selected={item.id === selectedId}
        isLast={itemIndex === photoCount - 1}
        accessibilityLabel={formatViewerLabel(
          copy.photos.viewerThumb,
          itemIndex + 1,
          photoCount
        )}
        borderColor={colors.fg}
        mutedColor={colors.surfaceMuted}
        onSelect={onSelectStrip}
      />
    ),
    [
      colors.fg,
      colors.surfaceMuted,
      copy.photos.viewerThumb,
      onSelectStrip,
      photoCount,
      selectedId,
    ]
  )

  const pagerKeyExtractor = useCallback((item: CaptureRecord) => item.id, [])
  const stripKeyExtractor = useCallback(
    (item: CaptureRecord) => `strip-${item.id}`,
    []
  )

  const onPagerScrollToIndexFailed = useCallback(
    ({ index: failedIndex }: { index: number }) => {
      pagerRef.current?.scrollToOffset({
        offset: failedIndex * width,
        animated: false,
      })
    },
    [width]
  )

  const onStripScrollToIndexFailed = useCallback(
    ({ index: failedIndex }: { index: number }) => {
      stripRef.current?.scrollToOffset({
        offset: failedIndex * (PHOTO_STRIP.thumb + PHOTO_STRIP.gap),
        animated: false,
      })
    },
    []
  )

  const stripContentStyle = useMemo(
    () => ({
      paddingLeft: padLeft,
      paddingRight: padRight,
    }),
    [padLeft, padRight]
  )

  const positionLabel = useMemo(() => {
    if (!photoCount) return ''
    return formatViewerLabel(copy.photos.viewerPosition, index + 1, photoCount)
  }, [copy.photos.viewerPosition, index, photoCount])

  if (photos === undefined) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.canvas }}
      >
        <ActivityIndicator color={colors.fg} />
      </View>
    )
  }

  if (photos.length === 0 || !photo) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-canvas-inverse">
        <Text style={{ fontFamily: fonts.regular, color: colors.muted }}>
          {copy.photos.empty}
        </Text>
      </View>
    )
  }

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-inverse"
      style={{ paddingTop: insets.top + SCREEN_HEADER_TOP_GAP }}
    >
      <View
        style={{
          paddingLeft: padLeft,
          paddingRight: padRight,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <IconButton
          name="chevronLeft"
          onPress={onBack}
          accessibilityLabel={copy.photos.back}
        />
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.muted,
          }}
          accessibilityRole="text"
        >
          {positionLabel}
        </Text>
        <IconButton
          name="trash"
          onPress={onDelete}
          accessibilityLabel={copy.photos.delete}
        />
      </View>

      <FlatList
        ref={pagerRef}
        style={{ flex: 1 }}
        data={photos}
        keyExtractor={pagerKeyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={index}
        getItemLayout={pagerGetItemLayout}
        onMomentumScrollEnd={onPagerScrollEnd}
        onScrollToIndexFailed={onPagerScrollToIndexFailed}
        renderItem={renderPagerItem}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
        updateCellsBatchingPeriod={50}
      />

      <View style={{ marginTop: 12, marginBottom: 12 }}>
        <FlatList
          ref={stripRef}
          data={photos}
          keyExtractor={stripKeyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          getItemLayout={stripGetItemLayout}
          onScrollToIndexFailed={onStripScrollToIndexFailed}
          contentContainerStyle={stripContentStyle}
          renderItem={renderStripItem}
          extraData={selectedId}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={5}
          removeClippedSubviews
          updateCellsBatchingPeriod={50}
        />
      </View>

      <View
        style={{
          paddingLeft: padLeft,
          paddingRight: padRight,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <Button
          label={copy.photos.share}
          name="share"
          onPress={() => void onShare()}
          style={actionButtonLayoutStyle(landscape)}
        />
      </View>
    </View>
  )
}
