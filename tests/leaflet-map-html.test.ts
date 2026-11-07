import {
  buildLeafletMapHtml,
  leafletCaptureScript,
  leafletRecenterScript,
  leafletUpdateScript,
  parseLeafletMapMessage,
} from '@/lib/leaflet-map-html'

describe('buildLeafletMapHtml', () => {
  it('embeds OpenStreetMap tiles in light mode', () => {
    const html = buildLeafletMapHtml({
      focusLat: 45.5,
      focusLon: 9.2,
      liveLat: 45.5,
      liveLon: 9.2,
      heading: 90,
      isAimedTarget: false,
      aimedTitle: 'Aimed',
      dark: false,
    })
    expect(html).toContain('tile.openstreetmap.fr/hot')
    expect(html).toContain('leaflet')
    expect(html).not.toContain('leaflet-rotate')
    expect(html).toContain('45.5')
    expect(html).toContain('"zoom":15')
    expect(html).toContain('#2563eb')
    expect(html).toContain('aim-hit')
    expect(html).toContain('iconSize: [48, 48]')
    expect(html).toContain('iconAnchor: [18, 18]')
    expect(html).not.toContain('margin-left: -18px')
    expect(html).not.toContain('cartocdn.com')
    expect(html).not.toContain('<html class="aib-dark">')
    expect(html).not.toContain('html.aib-dark .leaflet-tile-pane')
  })

  it('uses HOT OSM with a dark tile filter in dark mode', () => {
    const html = buildLeafletMapHtml({
      focusLat: 45.5,
      focusLon: 9.2,
      liveLat: null,
      liveLon: null,
      heading: null,
      isAimedTarget: true,
      aimedTitle: 'Aimed',
      dark: true,
    })
    expect(html).toContain('tile.openstreetmap.fr/hot')
    expect(html).toContain('invert(1)')
    expect(html).toContain('aib-dark')
    expect(html).toContain('color-scheme')
    expect(html).toContain('only light')
    expect(html).toContain('restoreCaptureTheme')
    expect(html).toContain("backgroundColor: '#e5e5e5'")
    expect(html).not.toContain('cartocdn.com')
    expect(html).toContain('isAimedTarget')
    expect(html).toContain('#AF2525')
    expect(html).toContain('draggable: true')
    expect(html).toContain('autoPan: false')
    expect(html).toContain('map.dragging.disable()')
    expect(html).toContain('aim-drag-end')
    expect(html).toContain('#111111')
  })

  it('respects a custom zoom level and escapes the aimed title', () => {
    const html = buildLeafletMapHtml({
      focusLat: 1,
      focusLon: 2,
      liveLat: 1,
      liveLon: 2,
      heading: 0,
      isAimedTarget: true,
      aimedTitle: 'Punto mirato "stimato"',
      dark: false,
      zoom: 17,
    })
    expect(html).toContain('"zoom":17')
    expect(html).toContain('Punto mirato \\"stimato\\"')
  })
})

describe('leaflet scripts', () => {
  it('builds an update script with coords', () => {
    const script = leafletUpdateScript({
      focusLat: 1,
      focusLon: 2,
      liveLat: 3,
      liveLon: 4,
      heading: 45,
      isAimedTarget: true,
      aimedTitle: 'x',
    })
    expect(script).toContain('updateFieldMap')
    expect(script).toContain('"focusLat":1')
    expect(script).toContain('"liveLat":3')
    expect(script).toMatch(/true;$/)
  })

  it('builds an update script with null live coords', () => {
    const script = leafletUpdateScript({
      focusLat: 1,
      focusLon: 2,
      liveLat: null,
      liveLon: null,
      heading: null,
      isAimedTarget: false,
      aimedTitle: '',
    })
    expect(script).toContain('"liveLat":null')
    expect(script).toContain('"heading":null')
  })

  it('builds a recenter script', () => {
    expect(leafletRecenterScript(45.1, 9.2)).toContain('recenterFieldMap')
    expect(leafletRecenterScript(45.1, 9.2)).toContain('45.1')
    expect(leafletRecenterScript(45.1, 9.2)).toContain(', null)')
  })

  it('passes an explicit recenter zoom', () => {
    expect(leafletRecenterScript(45.1, 9.2, 18)).toContain('45.1, 9.2, 18')
  })

  it('builds a capture script', () => {
    expect(leafletCaptureScript()).toContain('captureFieldMap')
  })
})

describe('parseLeafletMapMessage', () => {
  it('parses aim drag end messages', () => {
    expect(
      parseLeafletMapMessage(
        JSON.stringify({ type: 'aim-drag-end', lat: 45.1, lon: 9.2 })
      )
    ).toEqual({ type: 'aim-drag-end', lat: 45.1, lon: 9.2 })
  })

  it('parses map snapshot messages', () => {
    expect(
      parseLeafletMapMessage(
        JSON.stringify({
          type: 'map-snapshot',
          dataUrl: 'data:image/jpeg;base64,abc',
        })
      )
    ).toEqual({
      type: 'map-snapshot',
      dataUrl: 'data:image/jpeg;base64,abc',
    })
    expect(
      parseLeafletMapMessage(
        JSON.stringify({ type: 'map-snapshot-error', message: 'boom' })
      )
    ).toEqual({ type: 'map-snapshot-error', message: 'boom' })
    expect(
      parseLeafletMapMessage(JSON.stringify({ type: 'map-snapshot-error' }))
    ).toEqual({ type: 'map-snapshot-error', message: 'snapshot failed' })
  })

  it('rejects invalid payloads', () => {
    expect(parseLeafletMapMessage('nope')).toBeNull()
    expect(
      parseLeafletMapMessage(JSON.stringify({ type: 'other', lat: 1, lon: 2 }))
    ).toBeNull()
    expect(
      parseLeafletMapMessage(
        JSON.stringify({ type: 'aim-drag-end', lat: '45', lon: 9 })
      )
    ).toBeNull()
    expect(
      parseLeafletMapMessage(
        JSON.stringify({ type: 'aim-drag-end', lat: 45, lon: null })
      )
    ).toBeNull()
    expect(
      parseLeafletMapMessage(
        JSON.stringify({ type: 'aim-drag-end', lat: Number.NaN, lon: 9 })
      )
    ).toBeNull()
    expect(
      parseLeafletMapMessage(
        JSON.stringify({
          type: 'aim-drag-end',
          lat: 1,
          lon: Number.POSITIVE_INFINITY,
        })
      )
    ).toBeNull()
    expect(
      parseLeafletMapMessage(JSON.stringify({ type: 'aim-drag-end' }))
    ).toBeNull()
    expect(
      parseLeafletMapMessage(
        JSON.stringify({ type: 'map-snapshot', dataUrl: '' })
      )
    ).toBeNull()
    expect(
      parseLeafletMapMessage(JSON.stringify({ type: 'map-snapshot' }))
    ).toBeNull()
  })
})

describe('buildLeafletMapHtml capture wiring', () => {
  it('includes html2canvas and captureFieldMap', () => {
    const html = buildLeafletMapHtml({
      focusLat: 45.5,
      focusLon: 9.2,
      liveLat: 45.5,
      liveLon: 9.2,
      heading: null,
      isAimedTarget: false,
      aimedTitle: 'Aimed',
      dark: false,
    })
    expect(html).toContain('html2canvas')
    expect(html).toContain('captureFieldMap')
    expect(html).toContain('crossOrigin: true')
  })
})
