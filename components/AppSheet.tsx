import * as Haptics from '@/lib/haptics'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Keyboard, Platform, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SheetHeader } from '@/components/SheetHeader'
import { radii, useAppColors } from '@/lib/theme'

const FULL_HEIGHT_TOP_GAP = 10

type Props = {
  title: string
  closeLabel: string
  onClose: () => void
  height: 'content' | 'full'
  children: ReactNode
}

export function AppSheet({
  title,
  closeLabel,
  onClose,
  height,
  children,
}: Props) {
  const colors = useAppColors()
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, 16)
  const full = height === 'full'
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (full) return

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const onShow = Keyboard.addListener(showEvent, event => {
      setKeyboardHeight(event.endCoordinates.height)
    })
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0)
    })
    return () => {
      onShow.remove()
      onHide.remove()
    }
  }, [full])

  const dismissOutside = () => {
    void Haptics.selectionAsync()
    onClose()
  }

  const backdrop = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={closeLabel}
      onPress={dismissOutside}
      style={
        full
          ? { height: Math.max(insets.top, FULL_HEIGHT_TOP_GAP) }
          : { flex: 1 }
      }
    />
  )

  const panel = (
    <View
      style={{
        width: '100%',
        flex: full ? 1 : undefined,
        backgroundColor: colors.canvas,
        borderTopLeftRadius: radii.md,
        borderTopRightRadius: radii.md,
        overflow: 'hidden',
        paddingBottom:
          !full && keyboardHeight > 0 ? keyboardHeight + 8 : bottomPad,
      }}
    >
      <SheetHeader title={title} closeLabel={closeLabel} onClose={onClose} />
      {children}
    </View>
  )

  return (
    <View
      style={{
        flex: 1,
        width: '100%',
        justifyContent: full ? undefined : 'flex-end',
      }}
    >
      {backdrop}
      {panel}
    </View>
  )
}
