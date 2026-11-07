import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ComponentType,
  type Ref,
} from 'react'
import { StyleSheet } from 'react-native'
import { WebView as RNWebView } from 'react-native-webview'

import type { FieldMapProps } from '@/lib/field-map'
import {
  buildLeafletMapHtml,
  leafletCaptureScript,
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
    const onAimDragEndRef = useRef(onAimDragEnd)
    onAimDragEndRef.current = onAimDragEnd
    const pendingCaptureRef = useRef<{
      resolve: (uri: string) => void
      reject: (error: Error) => void
      timer: ReturnType<typeof setTimeout>
    } | null>(null)

    const html = useMemo(
      () =>
        buildLeafletMapHtml({
          focusLat,
          focusLon,
          liveLat,
          liveLon,
          heading,
          isAimedTarget,
          aimedTitle,
          dark: scheme === 'dark',
        }),
      [aimedTitle, isAimedTarget, scheme]
    )

    useEffect(() => {
      readyRef.current = false
    }, [html])

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
      <WebView
        key={scheme}
        ref={webRef}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']}
        source={{ html }}
        onLoadEnd={() => {
          readyRef.current = true
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
          webRef.current?.injectJavaScript(
            leafletRecenterScript(focusLat, focusLon)
          )
        }}
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
    )
  }
)
