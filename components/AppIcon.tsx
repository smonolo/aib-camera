import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { SymbolView, type SymbolViewProps } from 'expo-symbols'
import type { ComponentProps } from 'react'
import { Platform } from 'react-native'

type MaterialName = ComponentProps<typeof MaterialIcons>['name']

type Props = {
  sf: SymbolViewProps['name']
  material: MaterialName
  size?: number
  color: string
}

export function AppIcon({ sf, material, size = 22, color }: Props) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={sf}
        size={size}
        tintColor={color}
        weight="regular"
        resizeMode="scaleAspectFit"
        style={{ width: size, height: size }}
      />
    )
  }

  return <MaterialIcons name={material} size={size} color={color} />
}
