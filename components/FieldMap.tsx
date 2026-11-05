import { useEffect, useMemo, useRef, type ComponentType, type Ref } from 'react'
import { StyleSheet } from 'react-native'
import { WebView as RNWebView } from 'react-native-webview'

import type { FieldMapProps } from '@/lib/field-map'
import {
  buildLeafletMapHtml,
  leafletRecenterScript,
  leafletUpdateScript,
  parseLeafletMapMessage,
} from '@/lib/leaflet-map-html'

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
}

const WebView = RNWebView as unknown as ComponentType<MapWebViewProps>

export function FieldMap({
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
}: FieldMapProps) {
  const webRef = useRef<MapWebViewHandle>(null)
  const readyRef = useRef(false)
  const onAimDragEndRef = useRef(onAimDragEnd)
  onAimDragEndRef.current = onAimDragEnd

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
  }, [aimedTitle, focusLat, focusLon, heading, isAimedTarget, liveLat, liveLon])

  useEffect(() => {
    if (!readyRef.current) return
    webRef.current?.injectJavaScript(leafletRecenterScript(focusLat, focusLon))
  }, [recenterToken, focusLat, focusLon])

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
        if (message?.type === 'aim-drag-end') {
          onAimDragEndRef.current?.(message.lat, message.lon)
        }
      }}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      nestedScrollEnabled
      scrollEnabled={false}
      overScrollMode="never"
      androidLayerType="hardware"
    />
  )
}
