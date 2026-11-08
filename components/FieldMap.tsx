import { useFocusEffect } from 'expo-router'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type Ref,
} from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView as RNWebView } from 'react-native-webview'

import type { FieldMapProps } from '@/lib/field-map'
import { useOnAppActive } from '@/lib/hooks'
import {
  buildLeafletMapHtml,
  leafletCaptureScript,
  leafletPingScript,
  leafletRecenterScript,
  leafletRepairScript,
  leafletUpdateScript,
  parseLeafletMapMessage,
} from '@/lib/leaflet-map-html'
import { writeJpegDataUrl } from '@/lib/map-snapshot'

type MapWebViewHandle = {
  injectJavaScript: (script: string) => void
}

type MapWebViewProps = {
  ref?: Ref<MapWebViewHandle>
  style?: object
  originWhitelist?: string[]
  source: { html: string }
  onLoadEnd?: () => void
  onMessage?: (event: { nativeEvent: { data: string } }) => void
  javaScriptEnabled?: boolean
  domStorageEnabled?: boolean
  setSupportMultipleWindows?: boolean
  nestedScrollEnabled?: boolean
  scrollEnabled?: boolean
  overScrollMode?: string
  androidLayerType?: string
  forceDarkOn?: boolean
}

const WebView = RNWebView as unknown as ComponentType<MapWebViewProps>

const CAPTURE_TIMEOUT_MS = 20_000
const PING_TIMEOUT_MS = 800

export type FieldMapHandle = {
  captureJpeg: () => Promise<string>
}

export const FieldMap = forwardRef<FieldMapHandle, FieldMapProps>(
  function FieldMap(
    {
      focusLat,
      focusLon,
      liveLat,
      liveLon,
      heading,
      isAimedTarget,
      aimedTitle,
      scheme,
      recenterToken,
      onAimDragEnd,
    },
    ref
  ) {
    const webRef = useRef<MapWebViewHandle>(null)
    const readyRef = useRef(false)
    const focusRef = useRef({ lat: focusLat, lon: focusLon })
    focusRef.current = { lat: focusLat, lon: focusLon }
    const onAimDragEndRef = useRef(onAimDragEnd)
    onAimDragEndRef.current = onAimDragEnd
    const pendingCaptureRef = useRef<{
      resolve: (uri: string) => void
      reject: (error: Error) => void
      timer: ReturnType<typeof setTimeout>
    } | null>(null)
    const pingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const awaitingPongRef = useRef(false)
    const focusedRef = useRef(false)
    const [surfaceKey, setSurfaceKey] = useState(0)

    const html = useMemo(
      () =>
        buildLeafletMapHtml({
          focusLat: focusRef.current.lat,
          focusLon: focusRef.current.lon,
          liveLat,
          liveLon,
          heading,
          isAimedTarget,
          aimedTitle,
          dark: scheme === 'dark',
        }),
      [aimedTitle, isAimedTarget, scheme, surfaceKey]
    )

    const clearPingTimer = useCallback(() => {
      if (pingTimerRef.current == null) return
      clearTimeout(pingTimerRef.current)
      pingTimerRef.current = null
    }, [])

    const repairMap = useCallback(() => {
      if (!readyRef.current) return
      const { lat, lon } = focusRef.current
      webRef.current?.injectJavaScript(leafletRepairScript(lat, lon))
      webRef.current?.injectJavaScript(
        leafletUpdateScript({
          focusLat: lat,
          focusLon: lon,
          liveLat,
          liveLon,
          heading,
          isAimedTarget,
          aimedTitle,
        })
      )
    }, [aimedTitle, heading, isAimedTarget, liveLat, liveLon])

    const recoverMapSurface = useCallback(() => {
      clearPingTimer()
      awaitingPongRef.current = false
      readyRef.current = false
      setSurfaceKey(value => value + 1)
    }, [clearPingTimer])

    const pingOrRepair = useCallback(() => {
      if (!readyRef.current || !webRef.current) return
      clearPingTimer()
      awaitingPongRef.current = true
      webRef.current.injectJavaScript(leafletPingScript())
      pingTimerRef.current = setTimeout(() => {
        pingTimerRef.current = null
        if (!awaitingPongRef.current) return
        awaitingPongRef.current = false
        recoverMapSurface()
      }, PING_TIMEOUT_MS)
    }, [clearPingTimer, recoverMapSurface])

    useEffect(() => {
      readyRef.current = false
    }, [html, surfaceKey])

    useEffect(() => {
      if (!readyRef.current) return
      webRef.current?.injectJavaScript(
        leafletUpdateScript({
          focusLat,
          focusLon,
          liveLat,
          liveLon,
          heading,
          isAimedTarget,
          aimedTitle,
        })
      )
    }, [
      aimedTitle,
      focusLat,
      focusLon,
      heading,
      isAimedTarget,
      liveLat,
      liveLon,
    ])

    useEffect(() => {
      if (!readyRef.current) return
      const { lat, lon } = focusRef.current
      webRef.current?.injectJavaScript(leafletRecenterScript(lat, lon))
    }, [recenterToken])

    useFocusEffect(
      useCallback(() => {
        focusedRef.current = true
        const immediate = setTimeout(pingOrRepair, 0)
        const later = setTimeout(repairMap, 280)
        return () => {
          focusedRef.current = false
          clearTimeout(immediate)
          clearTimeout(later)
          clearPingTimer()
          awaitingPongRef.current = false
        }
      }, [clearPingTimer, pingOrRepair, repairMap])
    )

    useOnAppActive(() => {
      if (!focusedRef.current) return
      pingOrRepair()
      setTimeout(repairMap, 280)
    })

    useImperativeHandle(
      ref,
      () => ({
        captureJpeg: () =>
          new Promise<string>((resolve, reject) => {
            if (!readyRef.current || !webRef.current) {
              reject(new Error('Map is not ready'))
              return
            }
            if (pendingCaptureRef.current) {
              reject(new Error('Capture already in progress'))
              return
            }
            const timer = setTimeout(() => {
              pendingCaptureRef.current = null
              reject(new Error('Map capture timed out'))
            }, CAPTURE_TIMEOUT_MS)
            pendingCaptureRef.current = { resolve, reject, timer }
            webRef.current.injectJavaScript(leafletCaptureScript())
          }),
      }),
      []
    )

    useEffect(
      () => () => {
        clearPingTimer()
        const pending = pendingCaptureRef.current
        if (!pending) return
        clearTimeout(pending.timer)
        pendingCaptureRef.current = null
        pending.reject(new Error('Map unmounted'))
      },
      [clearPingTimer]
    )

    return (
      <View
        style={StyleSheet.absoluteFill}
        onLayout={() => {
          repairMap()
        }}
      >
        <WebView
          key={`${scheme}-${surfaceKey}`}
          ref={webRef}
          style={StyleSheet.absoluteFill}
          originWhitelist={['*']}
          source={{ html }}
          onLoadEnd={() => {
            readyRef.current = true
            repairMap()
            webRef.current?.injectJavaScript(
              leafletRecenterScript(focusLat, focusLon)
            )
            setTimeout(repairMap, 120)
            setTimeout(repairMap, 360)
          }}
          onMessage={event => {
            const message = parseLeafletMapMessage(event.nativeEvent.data)
            if (!message) return

            if (message.type === 'map-pong') {
              awaitingPongRef.current = false
              clearPingTimer()
              repairMap()
              return
            }

            if (message.type === 'aim-drag-end') {
              onAimDragEndRef.current?.(message.lat, message.lon)
              return
            }

            const pending = pendingCaptureRef.current
            if (!pending) return

            if (message.type === 'map-snapshot-error') {
              clearTimeout(pending.timer)
              pendingCaptureRef.current = null
              pending.reject(new Error(message.message))
              return
            }

            if (message.type === 'map-snapshot') {
              clearTimeout(pending.timer)
              pendingCaptureRef.current = null
              void writeJpegDataUrl(message.dataUrl)
                .then(uri => pending.resolve(uri))
                .catch(error =>
                  pending.reject(
                    error instanceof Error ? error : new Error(String(error))
                  )
                )
            }
          }}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          nestedScrollEnabled
          scrollEnabled={false}
          overScrollMode="never"
          androidLayerType="hardware"
          forceDarkOn={false}
        />
      </View>
    )
  }
)
