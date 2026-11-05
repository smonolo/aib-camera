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
  const tileUrl = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  const attribution = dark
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

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

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; width: 100%; background: ${dark ? '#111111' : '#e5e5e5'}; }
  .leaflet-control-attribution { font-size: 10px; }
  .user-puck {
    width: 36px;
    height: 36px;
    margin-left: -18px;
    margin-top: -18px;
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
  .aim-pin {
    width: 22px;
    height: 22px;
    margin-left: -11px;
    margin-top: -22px;
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
  var map = L.map('map', { zoomControl: false, attributionControl: true });
  L.tileLayer(${JSON.stringify(tileUrl)}, {
    maxZoom: 19,
    attribution: ${JSON.stringify(attribution)}
  }).addTo(map);
  map.setView([state.focusLat, state.focusLon], state.zoom);

  var userIcon = L.divIcon({
    className: '',
    html: '<div class="user-puck"><div class="user-puck-inner"><div class="user-cone" id="user-cone"></div><div class="user-dot"></div></div></div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
  var aimIcon = L.divIcon({
    className: '',
    html: '<div class="aim-pin"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 22]
  });

  var userMarker = null;
  var aimMarker = null;
  var aimDragging = false;

  function postAimDragEnd(lat, lon) {
    if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) return;
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'aim-drag-end',
      lat: lat,
      lon: lon
    }));
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
    });
    marker.on('dragend', function(event) {
      aimDragging = false;
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
          autoPan: true
        }).addTo(map);
        bindAimDrag(aimMarker);
      } else if (!aimDragging) {
        aimMarker.setLatLng([state.focusLat, state.focusLon]);
        aimMarker.dragging && aimMarker.dragging.enable();
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

  syncMarkers();
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

export function parseLeafletMapMessage(
  raw: string
): { type: 'aim-drag-end'; lat: number; lon: number } | null {
  try {
    const parsed = JSON.parse(raw) as {
      type?: unknown
      lat?: unknown
      lon?: unknown
    }
    if (parsed.type !== 'aim-drag-end') return null
    if (typeof parsed.lat !== 'number' || typeof parsed.lon !== 'number') {
      return null
    }
    if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lon)) {
      return null
    }
    return { type: 'aim-drag-end', lat: parsed.lat, lon: parsed.lon }
  } catch {
    return null
  }
}
