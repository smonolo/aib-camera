import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/AppIcon'
import { GlassSurface } from '@/components/GlassSurface'
import { IconButton } from '@/components/IconButton'
import { errorMessage, useToast } from '@/components/Toast'
import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { sharePhoto } from '@/lib/media'
import { getCapture, removeCapture } from '@/lib/storage'
import type { CaptureRecord } from '@/lib/types'

const SCREEN_PAD = 16

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const scheme = useColorScheme()
  const fg = scheme === 'dark' ? '#FAFAFA' : '#171717'
  const muted = scheme === 'dark' ? '#A3A3A3' : '#525252'
  const canvas = scheme === 'dark' ? '#111111' : '#F5F5F5'
  const copy = t()
  const { showError, showSuccess } = useToast()
  const [photo, setPhoto] = useState<CaptureRecord | null | undefined>(
    undefined
  )

  useFocusEffect(
    useCallback(() => {
      let active = true
      void getCapture(String(id)).then(record => {
        if (active) setPhoto(record)
      })
      return () => {
        active = false
      }
    }, [id])
  )

  const onShare = async () => {
    if (!photo) return
    try {
      await Haptics.selectionAsync()
      await sharePhoto(photo.uri)
    } catch (error) {
      showError(
        copy.photos.shareFailed,
        errorMessage(error, copy.review.retrySoon)
      )
    }
  }

  const onDelete = () => {
    if (!photo) return
    Alert.alert(copy.photos.deleteTitle, copy.photos.deleteBody, [
      { text: copy.photos.cancel, style: 'cancel' },
      {
        text: copy.photos.delete,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await removeCapture(photo.id)
              showSuccess(copy.photos.deleted)
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              )
              router.back()
            } catch (error) {
              showError(
                copy.photos.deleteFailed,
                errorMessage(error, copy.review.retrySoon)
              )
            }
          })()
        },
      },
    ])
  }

  if (photo === undefined) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: canvas }}
      >
        <ActivityIndicator color={fg} />
      </View>
    )
  }

  if (!photo) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-canvas-inverse">
        <Text style={{ fontFamily: fonts.regular, color: muted }}>
          {copy.review.empty}
        </Text>
      </View>
    )
  }

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-inverse"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View
        style={{
          paddingHorizontal: SCREEN_PAD,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <IconButton
          sf="chevron.backward"
          material="arrow-back"
          onPress={() => {
            void Haptics.selectionAsync()
            router.back()
          }}
          accessibilityLabel={copy.photos.back}
        />
        <IconButton
          sf="trash"
          material="delete-outline"
          onPress={onDelete}
          accessibilityLabel={copy.photos.delete}
        />
      </View>

      <View
        style={{ flex: 1, paddingHorizontal: SCREEN_PAD, marginBottom: 12 }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: scheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
          }}
        >
          <Image
            source={{ uri: photo.uri }}
            style={{ flex: 1 }}
            contentFit="contain"
          />
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: SCREEN_PAD,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <View style={{ borderRadius: 16, overflow: 'hidden' }}>
          <GlassSurface interactive style={{ borderRadius: 16 }}>
            <Pressable
              onPress={() => void onShare()}
              accessibilityLabel={copy.photos.share}
              style={{
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <AppIcon
                sf="square.and.arrow.up"
                material="ios-share"
                size={18}
                color={fg}
              />
              <Text
                style={{ fontFamily: fonts.semibold, fontSize: 16, color: fg }}
              >
                {copy.photos.share}
              </Text>
            </Pressable>
          </GlassSurface>
        </View>
      </View>
    </View>
  )
}
