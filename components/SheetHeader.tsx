import * as Haptics from '@/lib/haptics'
import { Text, View } from 'react-native'

import { IconButton } from '@/components/IconButton'
import { fonts } from '@/lib/fonts'
import { SCREEN_PAD } from '@/lib/layout'
import { useAppColors } from '@/lib/theme'

type Props = {
  title: string
  closeLabel: string
  onClose: () => void
}

export function SheetHeader({ title, closeLabel, onClose }: Props) {
  const colors = useAppColors()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SCREEN_PAD,
        paddingTop: 14,
        paddingBottom: 8,
        gap: 12,
      }}
    >
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.semibold,
          fontSize: 18,
          color: colors.fg,
        }}
        numberOfLines={1}
      >
        {title}
      </Text>
      <IconButton
        sf="xmark"
        material="close"
        onPress={() => {
          void Haptics.selectionAsync()
          onClose()
        }}
        accessibilityLabel={closeLabel}
      />
    </View>
  )
}
