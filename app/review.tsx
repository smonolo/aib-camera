import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/AppIcon'
import { GlassButton } from '@/components/GlassButton'
import { GlassSurface } from '@/components/GlassSurface'
import { errorMessage, useToast } from '@/components/Toast'
import { fonts } from '@/lib/fonts'
import { t } from '@/lib/i18n'
import { saveToAibAlbum, sharePhoto } from '@/lib/media'
import { useStampSettings } from '@/lib/settings-context'
import { addCapture } from '@/lib/storage'
import { useAppColors } from '@/lib/theme'

export default function ReviewScreen() {
  const insets = useSafeAreaInsets()
  const colors = useAppColors()
  const { settings } = useStampSettings()
  const { showError, showSuccess } = useToast()
  const copy = t()
  const params = useLocalSearchParams<{
    uri: string
    takenAt: string
    lat?: string
    lon?: string
    accuracy?: string
    altitude?: string
    heading?: string
    address?: string
  }>()
  const [busy, setBusy] = useState<'save' | 'share' | null>(null)
  const [savedToGallery, setSavedToGallery] = useState(false)
  const [savedToPhotos, setSavedToPhotos] = useState(false)

  const uri = typeof params.uri === 'string' ? params.uri : ''

  const recordBase = useMemo(
    () => ({
      takenAt: params.takenAt || new Date().toISOString(),
      lat: params.lat ? Number(params.lat) : null,
      lon: params.lon ? Number(params.lon) : null,
      accuracy: params.accuracy ? Number(params.accuracy) : null,
      altitude: params.altitude ? Number(params.altitude) : null,
      heading: params.heading ? Number(params.heading) : null,
      address: params.address || null,
      customText: settings.customLines,
      stampConfigSnapshot: settings,
    }),
    [params, settings]
  )

  const persistLocal = async () => {
    if (savedToGallery || !uri) return
    await addCapture({
      id: `${Date.now()}`,
      uri,
      ...recordBase,
    })
    setSavedToGallery(true)
  }

  const persistPhotos = async () => {
    if (savedToPhotos || !uri) return
    await saveToAibAlbum(uri)
    setSavedToPhotos(true)
  }

  const onSave = async () => {
    if (!uri) return
    setBusy('save')
    try {
      // In-app gallery is the source of truth in emergencies; Photos album is best-effort.
      await persistLocal()
      let albumOk = true
      try {
        await persistPhotos()
      } catch (photosError) {
        albumOk = false
        console.warn(photosError)
      }
      showSuccess(
        copy.review.savedTitle,
        albumOk ? copy.review.savedBody : copy.review.savedBodyLocalOnly
      )
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/gallery')
    } catch (error) {
      console.error(error)
      showError(
        copy.review.saveFailed,
        errorMessage(error, copy.review.retrySoon)
      )
    } finally {
      setBusy(null)
    }
  }

  const onShare = async () => {
    if (!uri) return
    setBusy('share')
    try {
      await persistLocal()
      try {
        await persistPhotos()
      } catch (photosError) {
        console.warn(photosError)
      }
      await sharePhoto(uri)
      await Haptics.selectionAsync()
    } catch (error) {
      console.error(error)
      showError(
        copy.review.shareFailed,
        errorMessage(error, copy.review.retrySoon)
      )
    } finally {
      setBusy(null)
    }
  }

  if (!uri) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-canvas-inverse">
        <Text style={{ fontFamily: fonts.regular, color: colors.muted }}>
          {copy.review.empty}
        </Text>
      </View>
    )
  }

  return (
    <View
      className="flex-1 bg-canvas dark:bg-canvas-inverse"
      style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}
    >
      <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 18 }}>
        <View
          style={{
            width: 36,
            height: 5,
            borderRadius: 999,
            backgroundColor: colors.grabber,
          }}
        />
      </View>

      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.semibold,
            fontSize: 17,
            color: colors.fg,
            letterSpacing: -0.2,
          }}
        >
          {copy.review.title}
        </Text>
        <View style={{ borderRadius: 999, overflow: 'hidden' }}>
          <GlassSurface interactive style={{ borderRadius: 999 }}>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync()
                router.back()
              }}
              accessibilityLabel={copy.review.retake}
              style={{
                minHeight: 40,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AppIcon
                sf="arrow.counterclockwise"
                material="replay"
                size={16}
                color={colors.fg}
              />
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 14,
                  color: colors.fg,
                }}
              >
                {copy.review.retake}
              </Text>
            </Pressable>
          </GlassSurface>
        </View>
      </View>

      <Image
        source={{ uri }}
        style={{
          flex: 1,
          marginHorizontal: 16,
          borderRadius: 16,
          overflow: 'hidden',
        }}
        contentFit="contain"
      />

      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingHorizontal: 16,
          paddingTop: 12,
        }}
      >
        <GlassButton
          flex
          label={copy.review.save}
          sf="square.and.arrow.down"
          material="save-alt"
          onPress={onSave}
          disabled={busy != null}
          loading={busy === 'save'}
        />
        <GlassButton
          flex
          label={copy.review.share}
          sf="square.and.arrow.up"
          material="ios-share"
          onPress={onShare}
          disabled={busy != null}
          loading={busy === 'share'}
        />
      </View>
    </View>
  )
}
