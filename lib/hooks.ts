import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'

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
