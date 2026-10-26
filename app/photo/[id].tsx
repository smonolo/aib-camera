import * as Haptics from '@/lib/haptics'
import { Image } from 'expo-image'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { useToast } from '@/components/Toast'
import { errorMessage } from '@/lib/errors'
import { fonts } from '@/lib/fonts'
import { useHapticBack } from '@/lib/hooks'
import { useI18n } from '@/lib/i18n/locale-context'
import { SCREEN_PAD_NARROW } from '@/lib/layout'
import { deleteCaptures, sharePhotos } from '@/lib/media'
import { getCapture } from '@/lib/storage'
import { useAppColors } from '@/lib/theme'
import type { CaptureRecord } from '@/lib/types'

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const colors = useAppColors()
  const { copy } = useI18n()
  const { showError, showSuccess } = useToast()
  const onBack = useHapticBack()
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
      await sharePhotos([photo.uri])
    } catch (error) {
      showError(
        copy.photos.shareFailed,
        errorMessage(error, copy.photos.retrySoon)
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
              await deleteCaptures([photo.id])
              showSuccess(copy.photos.deleted)
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              )
              router.back()
            } catch (error) {
              showError(
                copy.photos.deleteFailed,
                errorMessage(error, copy.photos.retrySoon)
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
        style={{ backgroundColor: colors.canvas }}
      >
        <ActivityIndicator color={colors.fg} />
      </View>
    )
  }

  if (!photo) {
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
      style={{ paddingTop: insets.top + 8 }}
    >
      <View
        style={{
          paddingHorizontal: SCREEN_PAD_NARROW,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <IconButton
          sf="chevron.backward"
          material="arrow-back"
          onPress={onBack}
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
        style={{
          flex: 1,
          paddingHorizontal: SCREEN_PAD_NARROW,
          marginBottom: 12,
        }}
      >
        <Image
          source={{ uri: photo.uri }}
          style={{ flex: 1 }}
          contentFit="contain"
        />
      </View>

      <View
        style={{
          paddingHorizontal: SCREEN_PAD_NARROW,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <Button
          label={copy.photos.share}
          sf="square.and.arrow.up"
          material="ios-share"
          onPress={() => void onShare()}
        />
      </View>
    </View>
  )
}
