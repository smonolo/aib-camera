import { useEffect, useMemo, useRef } from 'react'
import { StyleSheet } from 'react-native'
import MapView, { Marker } from 'react-native-maps'

import type { FieldMapProps } from '@/lib/field-map'

const DEFAULT_DELTA = 0.012

export function FieldMap({
  focusLat,
  focusLon,
  isAimedTarget,
  aimedTitle,
  scheme,
  recenterToken,
  onAimDragEnd,
}: FieldMapProps) {
  const mapRef = useRef<MapView>(null)

  const region = useMemo(
    () => ({
      latitude: focusLat,
      longitude: focusLon,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    }),
    [focusLat, focusLon]
  )

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 350)
  }, [recenterToken, region])

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={region}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      userInterfaceStyle={scheme}
    >
      {isAimedTarget ? (
        <Marker
          coordinate={{
            latitude: focusLat,
            longitude: focusLon,
          }}
          title={aimedTitle}
          pinColor="#AF2525"
          draggable
          onDragEnd={event => {
            const { latitude, longitude } = event.nativeEvent.coordinate
            onAimDragEnd?.(latitude, longitude)
          }}
        />
      ) : null}
    </MapView>
  )
}
