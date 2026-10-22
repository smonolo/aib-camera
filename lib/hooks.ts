import { router } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'
import { AppState } from 'react-native'

import { selectionAsync } from '@/lib/haptics'

export function useOnAppActive(onActive: () => void) {
  const onActiveRef = useRef(onActive)
  onActiveRef.current = onActive

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') onActiveRef.current()
    })
    return () => sub.remove()
  }, [])
}

export function useHapticBack() {
  return useCallback(() => {
    void selectionAsync()
    router.back()
  }, [])
}
