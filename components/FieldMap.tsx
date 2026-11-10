import { useFocusEffect } from 'expo-router'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
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
  leafletInvalidateSizeScript,
  leafletRecenterScript,
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
  cacheEnabled?: boolean
  allowsInlineMediaPlayback?: boolean
  mediaPlaybackRequiresUserAction?: boolean
  setBuiltInZoomControls?: boolean
  displayZoomControls?: boolean
}

const WebView = RNWebView as unknown as ComponentType<MapWebViewProps>

const CAPTURE_TIMEOUT_MS = 20_000

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
    const propsRef = useRef({
      focusLat,
      focusLon,
      liveLat,
      liveLon,
      heading,
      isAimedTarget,
      aimedTitle,
    })
    propsRef.current = {
      focusLat,
      focusLon,
      liveLat,
      liveLon,
      heading,
      isAimedTarget,
      aimedTitle,
    }
    const onAimDragEndRef = useRef(onAimDragEnd)
    onAimDragEndRef.current = onAimDragEnd
    const layoutSizeRef = useRef({ width: 0, height: 0 })
    const pendingCaptureRef = useRef<{
      resolve: (uri: string) => void
      reject: (error: Error) => void
      timer: ReturnType<typeof setTimeout>
    } | null>(null)

    const html = useMemo(() => {
      const current = propsRef.current
      return buildLeafletMapHtml({
        focusLat: current.focusLat,
        focusLon: current.focusLon,
        liveLat: current.liveLat,
        liveLon: current.liveLon,
        heading: current.heading,
        isAimedTarget: current.isAimedTarget,
        aimedTitle: current.aimedTitle,
        dark: scheme === 'dark',
      })
    }, [scheme])

    const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastPushRef = useRef('')
    const pendingPushRef = useRef({
      focusLat,
      focusLon,
      liveLat,
      liveLon,
      heading,
      isAimedTarget,
      aimedTitle,
    })

    const pushState = useCallback(
      (immediate = false) => {
        if (!readyRef.current) return
        const payload = {
          focusLat,
          focusLon,
          liveLat,
          liveLon,
          heading,
          isAimedTarget,
          aimedTitle,
        }
        pendingPushRef.current = payload
        const serialized = JSON.stringify(payload)
        if (
          serialized === lastPushRef.current &&
          pushTimerRef.current == null
        ) {
          return
        }

        const run = () => {
          pushTimerRef.current = null
          if (!readyRef.current) return
          const next = pendingPushRef.current
          const nextSerialized = JSON.stringify(next)
          if (nextSerialized === lastPushRef.current) return
          lastPushRef.current = nextSerialized
          webRef.current?.injectJavaScript(leafletUpdateScript(next))
        }

        if (immediate) {
          if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
          run()
          return
        }

        if (pushTimerRef.current) return
        pushTimerRef.current = setTimeout(run, 180)
      },
      [aimedTitle, focusLat, focusLon, heading, isAimedTarget, liveLat, liveLon]
    )

    const invalidateSize = useCallback(() => {
      if (!readyRef.current) return
      webRef.current?.injectJavaScript(leafletInvalidateSizeScript())
    }, [])

    useEffect(() => {
      readyRef.current = false
      lastPushRef.current = ''
    }, [html])

    useEffect(() => {
      pushState()
      return () => {
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
      }
    }, [pushState])

    useEffect(() => {
      if (!readyRef.current) return
      const { lat, lon } = focusRef.current
      webRef.current?.injectJavaScript(leafletRecenterScript(lat, lon))
    }, [recenterToken])

    useFocusEffect(
      useCallback(() => {
        const timer = setTimeout(invalidateSize, 50)
        return () => clearTimeout(timer)
      }, [invalidateSize])
    )

    useOnAppActive(() => {
      invalidateSize()
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
        const pending = pendingCaptureRef.current
        if (!pending) return
        clearTimeout(pending.timer)
        pendingCaptureRef.current = null
        pending.reject(new Error('Map unmounted'))
      },
      []
    )

    return (
      <View
        style={StyleSheet.absoluteFill}
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout
          const prev = layoutSizeRef.current
          if (
            Math.abs(prev.width - width) < 1 &&
            Math.abs(prev.height - height) < 1
          ) {
            return
          }
          layoutSizeRef.current = { width, height }
          invalidateSize()
        }}
      >
        <WebView
          key={scheme}
          ref={webRef}
          style={StyleSheet.absoluteFill}
          originWhitelist={['*']}
          source={{ html }}
          onLoadEnd={() => {
            readyRef.current = true
            pushState(true)
            webRef.current?.injectJavaScript(
              leafletRecenterScript(focusLat, focusLon)
            )
            setTimeout(invalidateSize, 50)
          }}
          cacheEnabled
          allowsInlineMediaPlayback={false}
          mediaPlaybackRequiresUserAction
          setBuiltInZoomControls={false}
          displayZoomControls={false}
          onMessage={event => {
            const message = parseLeafletMapMessage(event.nativeEvent.data)
            if (!message) return

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
