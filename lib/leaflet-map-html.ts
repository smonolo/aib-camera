type LeafletMapHtmlOptions = {
  focusLat: number
  focusLon: number
  liveLat: number | null
  liveLon: number | null
  heading: number | null
  isAimedTarget: boolean
  aimedTitle: string
  dark: boolean
  zoom?: number
}

export function buildLeafletMapHtml(options: LeafletMapHtmlOptions): string {
  const zoom = options.zoom ?? 15
  const dark = options.dark
  const tileUrl = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://www.hotosm.org/" target="_blank">HOT</a>'
  const leafletCss =
    'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'
  const leafletJs = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'
  const html2canvasJs =
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'

  const initial = JSON.stringify({
    focusLat: options.focusLat,
    focusLon: options.focusLon,
    liveLat: options.liveLat,
    liveLon: options.liveLon,
    heading: options.heading,
    isAimedTarget: options.isAimedTarget,
    aimedTitle: options.aimedTitle,
    zoom,
  })

  const darkFilter =
    'invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9)'

  return `<!DOCTYPE html>
<html${dark ? ' class="aib-dark"' : ''}>
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="only light" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="${leafletCss}" />
<script src="${leafletJs}"></script>
<script src="${html2canvasJs}"></script>
<style>
  :root { color-scheme: only light; }
  html, body, #map { margin: 0; height: 100%; width: 100%; background: ${dark ? '#111111' : '#e5e5e5'}; }
  .leaflet-tile { image-rendering: -webkit-optimize-contrast; }
  .leaflet-control-attribution {
    font-size: 8px !important;
    line-height: 1.1 !important;
    padding: 1px 4px !important;
    margin: 0 !important;
    background: rgba(255,255,255,0.55) !important;
    color: rgba(0,0,0,0.55) !important;
    box-shadow: none !important;
    max-width: 40%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .leaflet-control-attribution a { color: inherit !important; }
  ${
    dark
      ? `html.aib-dark .leaflet-tile-pane {
    filter: ${darkFilter};
    -webkit-filter: ${darkFilter};
  }
  html.aib-dark .leaflet-control-attribution {
    filter: ${darkFilter};
    -webkit-filter: ${darkFilter};
  }`
      : ''
  }
  .user-puck {
    width: 36px;
    height: 36px;
  }
  .user-puck-inner {
    width: 36px;
    height: 36px;
    position: relative;
  }
  .user-cone {
    position: absolute;
    left: 50%;
    top: 2px;
    width: 0;
    height: 0;
    margin-left: -7px;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-bottom: 14px solid rgba(37, 99, 235, 0.85);
    transform-origin: 50% 16px;
  }
  .user-dot {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 14px;
    height: 14px;
    margin-left: -7px;
    margin-top: -7px;
    border-radius: 50%;
    background: #2563eb;
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.35);
  }
  .aib-div-icon {
    background: transparent !important;
    border: none !important;
  }
  .aim-hit {
    width: 48px;
    height: 48px;
    position: relative;
  }
  .aim-pin {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 22px;
    height: 22px;
    margin-left: -11px;
    border-radius: 50% 50% 50% 0;
    background: #AF2525;
    transform: rotate(-45deg);
    border: 2px solid #ffffff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.35);
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var state = ${initial};
  var map = L.map('map', {
    zoomControl: false,
    attributionControl: true,
    fadeAnimation: false,
    zoomAnimation: true
  });
  var tiles = L.tileLayer(${JSON.stringify(tileUrl)}, {
    maxZoom: 18,
    maxNativeZoom: 18,
    minZoom: 2,
    keepBuffer: 4,
    updateWhenIdle: true,
    updateWhenZooming: false,
    updateInterval: 200,
    crossOrigin: true,
    attribution: ${JSON.stringify(attribution)}
  });
  tiles.on('tileerror', function(event) {
    var tile = event.tile;
    if (!tile || tile._aibRetry) return;
    tile._aibRetry = true;
    setTimeout(function() {
      if (!tile.parentNode) return;
      tile.src = event.url + (event.url.indexOf('?') >= 0 ? '&' : '?') + 'r=' + Date.now();
    }, 400);
  });
  tiles.addTo(map);
  map.setView([state.focusLat, state.focusLon], state.zoom);
  var isDark = ${dark ? 'true' : 'false'};
  var darkFilterCss = ${dark ? JSON.stringify(darkFilter) : '""'};

  if (isDark) {
    var tilePane = map.getPane('tilePane');
    if (tilePane) {
      tilePane.style.filter = darkFilterCss;
      tilePane.style.webkitFilter = darkFilterCss;
    }
  }

  var userIcon = L.divIcon({
    className: 'aib-div-icon',
    html: '<div class="user-puck"><div class="user-puck-inner"><div class="user-cone" id="user-cone"></div><div class="user-dot"></div></div></div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
  var aimIcon = L.divIcon({
    className: 'aib-div-icon',
    html: '<div class="aim-hit"><div class="aim-pin"></div></div>',
    iconSize: [48, 48],
    iconAnchor: [24, 48]
  });

  var userMarker = null;
  var aimMarker = null;
  var aimDragging = false;

  function postMessage(payload) {
    if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) return;
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }

  function postAimDragEnd(lat, lon) {
    postMessage({ type: 'aim-drag-end', lat: lat, lon: lon });
  }

  function postSnapshotError(message) {
    postMessage({ type: 'map-snapshot-error', message: String(message || 'snapshot failed') });
  }

  function applyHeading(heading) {
    var cone = document.getElementById('user-cone');
    if (!cone) return;
    if (heading == null || !isFinite(heading)) {
      cone.style.visibility = 'hidden';
      return;
    }
    cone.style.visibility = 'visible';
    cone.style.transform = 'rotate(' + heading + 'deg)';
  }

  function bindAimDrag(marker) {
    marker.off('dragstart');
    marker.off('dragend');
    marker.on('dragstart', function() {
      aimDragging = true;
      map.dragging.disable();
    });
    marker.on('dragend', function(event) {
      aimDragging = false;
      map.dragging.enable();
      var ll = event.target.getLatLng();
      state.focusLat = ll.lat;
      state.focusLon = ll.lng;
      postAimDragEnd(ll.lat, ll.lng);
    });
  }

  function syncMarkers() {
    if (state.liveLat != null && state.liveLon != null) {
      if (!userMarker) {
        userMarker = L.marker([state.liveLat, state.liveLon], {
          icon: userIcon,
          interactive: false,
          keyboard: false
        }).addTo(map);
      } else {
        userMarker.setLatLng([state.liveLat, state.liveLon]);
      }
      applyHeading(state.heading);
    } else if (userMarker) {
      map.removeLayer(userMarker);
      userMarker = null;
    }

    if (state.isAimedTarget) {
      if (!aimMarker) {
        aimMarker = L.marker([state.focusLat, state.focusLon], {
          icon: aimIcon,
          title: state.aimedTitle || '',
          draggable: true,
          autoPan: false,
          zIndexOffset: 600
        }).addTo(map);
        bindAimDrag(aimMarker);
      } else if (!aimDragging) {
        aimMarker.setLatLng([state.focusLat, state.focusLon]);
        if (aimMarker.dragging) aimMarker.dragging.enable();
      }
    } else if (aimMarker) {
      map.removeLayer(aimMarker);
      aimMarker = null;
      aimDragging = false;
    }
  }

  window.updateFieldMap = function(next) {
    state = Object.assign({}, state, next || {});
    syncMarkers();
  };

  window.recenterFieldMap = function(lat, lon, zoom) {
    if (aimDragging) return;
    map.setView([lat, lon], zoom == null ? map.getZoom() : zoom, { animate: true });
  };

  window.invalidateFieldMapSize = function() {
    map.invalidateSize({ animate: false, pan: false });
  };

  function restoreCaptureTheme() {
    if (isDark) {
      document.documentElement.classList.add('aib-dark');
      var tilePane = map.getPane('tilePane');
      if (tilePane) {
        tilePane.style.filter = darkFilterCss;
        tilePane.style.webkitFilter = darkFilterCss;
      }
    }
  }

  window.captureFieldMap = function() {
    var el = document.getElementById('map');
    if (!el || typeof window.html2canvas !== 'function') {
      postSnapshotError('snapshot unavailable');
      return;
    }
    document.documentElement.classList.remove('aib-dark');
    var tilePane = map.getPane('tilePane');
    if (tilePane) {
      tilePane.style.filter = 'none';
      tilePane.style.webkitFilter = 'none';
    }
    window.html2canvas(el, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#e5e5e5',
      logging: false,
      scale: Math.min(2, window.devicePixelRatio || 2)
    }).then(function(canvas) {
      restoreCaptureTheme();
      postMessage({
        type: 'map-snapshot',
        dataUrl: canvas.toDataURL('image/jpeg', 0.92)
      });
    }).catch(function(error) {
      restoreCaptureTheme();
      postSnapshotError(error && error.message ? error.message : error);
    });
  };

  syncMarkers();
  setTimeout(function() { map.invalidateSize({ animate: false, pan: false }); }, 0);
</script>
</body>
</html>`
}

export function leafletUpdateScript(payload: {
  focusLat: number
  focusLon: number
  liveLat: number | null
  liveLon: number | null
  heading: number | null
  isAimedTarget: boolean
  aimedTitle: string
}): string {
  return `window.updateFieldMap && window.updateFieldMap(${JSON.stringify(payload)}); true;`
}

export function leafletRecenterScript(
  lat: number,
  lon: number,
  zoom?: number
): string {
  const z = zoom == null ? 'null' : String(zoom)
  return `window.recenterFieldMap && window.recenterFieldMap(${lat}, ${lon}, ${z}); true;`
}

export function leafletInvalidateSizeScript(): string {
  return `window.invalidateFieldMapSize && window.invalidateFieldMapSize(); true;`
}

export function leafletCaptureScript(): string {
  return `window.captureFieldMap && window.captureFieldMap(); true;`
}

export type LeafletMapMessage =
  | { type: 'aim-drag-end'; lat: number; lon: number }
  | { type: 'map-snapshot'; dataUrl: string }
  | { type: 'map-snapshot-error'; message: string }

export function parseLeafletMapMessage(raw: string): LeafletMapMessage | null {
  try {
    const parsed = JSON.parse(raw) as {
      type?: unknown
      lat?: unknown
      lon?: unknown
      dataUrl?: unknown
      message?: unknown
    }
    if (parsed.type === 'aim-drag-end') {
      if (typeof parsed.lat !== 'number' || typeof parsed.lon !== 'number') {
        return null
      }
      if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lon)) {
        return null
      }
      return { type: 'aim-drag-end', lat: parsed.lat, lon: parsed.lon }
    }
    if (parsed.type === 'map-snapshot') {
      if (typeof parsed.dataUrl !== 'string' || parsed.dataUrl.length === 0) {
        return null
      }
      return { type: 'map-snapshot', dataUrl: parsed.dataUrl }
    }
    if (parsed.type === 'map-snapshot-error') {
      return {
        type: 'map-snapshot-error',
        message:
          typeof parsed.message === 'string' && parsed.message
            ? parsed.message
            : 'snapshot failed',
      }
    }
    return null
  } catch {
    return null
  }
}
