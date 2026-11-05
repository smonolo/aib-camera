export type FieldMapProps = {
  focusLat: number
  focusLon: number
  liveLat: number | null
  liveLon: number | null
  heading: number | null
  isAimedTarget: boolean
  aimedTitle: string
  scheme: 'light' | 'dark'
  recenterToken: string
  onAimDragEnd?: (lat: number, lon: number) => void
}
