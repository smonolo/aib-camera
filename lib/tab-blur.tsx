import {
  createContext,
  useContext,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react'
import type { View } from 'react-native'

export type TabBlurHost = ComponentRef<typeof View>

const TabBlurTargetContext =
  createContext<RefObject<TabBlurHost | null> | null>(null)

export function TabBlurTargetProvider({
  targetRef,
  children,
}: {
  targetRef: RefObject<TabBlurHost | null>
  children: ReactNode
}) {
  return (
    <TabBlurTargetContext.Provider value={targetRef}>
      {children}
    </TabBlurTargetContext.Provider>
  )
}

export function useTabBlurTarget(): RefObject<TabBlurHost | null> | null {
  return useContext(TabBlurTargetContext)
}
