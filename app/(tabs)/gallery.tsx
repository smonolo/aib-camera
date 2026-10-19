import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { router, useFocusEffect } from 'expo-router'
import { memo, useCallback, useState } from 'react'
import {
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/AppIcon'
import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { formatGalleryDateTime, formatShortCoordinates } from '@/lib/stamp'
import { loadCaptures } from '@/lib/storage'
import { useAppColors } from '@/lib/theme'
import type { CaptureRecord } from '@/lib/types'

const SCREEN_PAD = 20
const GAP = 12

export default function PhotosScreen() {
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  const colors = useAppColors()
  const copy = t()
  const [captures, setCaptures] = useState<CaptureRecord[]>([])
  const itemWidth = (windowWidth - SCREEN_PAD * 2 - GAP) / 2

  const refresh = useCallback(async () => {
    setCaptures(await loadCaptures())
  }, [])

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh])
  )

  const renderItem = useCallback(
    ({ item }: { item: CaptureRecord }) => (
      <GalleryTile item={item} width={itemWidth} />
    ),
    [itemWidth]
  )

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-inverse"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View style={{ paddingHorizontal: SCREEN_PAD, paddingBottom: 16 }}>
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: 28,
            color: colors.fg,
            letterSpacing: -0.4,
          }}
        >
          {copy.photos.title}
        </Text>
      </View>

      <FlatList
        data={captures}
        keyExtractor={item => item.id}
        numColumns={2}
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PAD,
          paddingBottom: insets.bottom + 24,
          gap: GAP,
        }}
        columnWrapperStyle={{ gap: GAP }}
        ListEmptyComponent={<GalleryEmpty />}
        renderItem={renderItem}
      />
    </View>
  )
}

const GalleryTile = memo(function GalleryTile({
  item,
  width,
}: {
  item: CaptureRecord
  width: number
}) {
  const colors = useAppColors()

  return (
    <Pressable
      onPress={async () => {
        await Haptics.selectionAsync()
        router.push({ pathname: '/photo/[id]', params: { id: item.id } })
      }}
      style={{
        width,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: colors.surface,
      }}
    >
      <Image
        source={{ uri: item.uri }}
        recyclingKey={item.id}
        style={{ width: '100%', aspectRatio: 3 / 4 }}
      />
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text
          style={{
            flexShrink: 1,
            fontFamily: fonts.medium,
            fontSize: 12,
            color: colors.fg,
          }}
          numberOfLines={1}
        >
          {formatGalleryDateTime(item.takenAt)}
        </Text>
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 11,
            color: colors.muted,
          }}
          numberOfLines={1}
        >
          {item.lat != null && item.lon != null
            ? formatShortCoordinates(item.lat, item.lon)
            : '—'}
        </Text>
      </View>
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
          borderRadius: 16,
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
