/** Map handling and marker rendering */
import appState from './state.mjs';
import { saveLocations } from './storage.mjs';

const PREFERRED_MAP_LAYER_KEY = 'preferredMapLayerName';
let markerClickHandler = null;

const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20
});

const cartoPositron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  subdomains: 'abcd',
  maxZoom: 20
});

const cartoDarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  subdomains: 'abcd',
  maxZoom: 20
});

const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles \xA9 Esri',
  maxZoom: 20
});

const baseLayers = {
  'Satellite': esriSatellite,
  'OpenStreetMap': osmLayer,
  'Carto Light': cartoPositron,
  'Carto Dark': cartoDarkMatter
};

let currentBaseLayer = null;
let currentBaseLayerName = null;

// Fetch the angle of the nearest road around the given point using the
// Overpass API. 0 degrees is returned if no road data is available.
export async function getRoadOrientation(lat, lng) {
  const query = `[out:json];way(around:35,${lat},${lng})[highway];out geom;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = await res.json();
    const way = data.elements && data.elements.find(e => e.geometry && e.geometry.length > 1);
    if (!way) return 0;
    const g = way.geometry;
    const lat1 = g[0].lat, lon1 = g[0].lon;
    const lat2 = g[1].lat, lon2 = g[1].lon;
    const toRad = d => d * Math.PI / 180;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    return bearing;
  } catch (err) {
    console.error('orientation fetch error', err);
    return 0;
  }
}

export async function applyRoadOrientation(marker) {
  if (!marker._icon) return;
  const inner = marker._icon.querySelector('.custom-label-marker-inner');
  if (!inner) return;
  const { lat, lng } = marker.getLatLng();
  const angle = await getRoadOrientation(lat, lng);
  const rotation = angle - 90;
  inner.style.setProperty('--rotation', `${rotation}deg`);
}

export function loadMap() {
  return new Promise((resolve, reject) => {
    try {
      initMap();
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

export function initMap() {
  appState.map = L.map('map').setView([51.505, -0.09], 2);

  const preferredLayerName = localStorage.getItem(PREFERRED_MAP_LAYER_KEY);
  currentBaseLayerName = preferredLayerName && baseLayers[preferredLayerName]
    ? preferredLayerName
    : 'OpenStreetMap';
  currentBaseLayer = baseLayers[currentBaseLayerName];
  currentBaseLayer.addTo(appState.map);

  appState.markersLayer = L.layerGroup().addTo(appState.map);

  appState.map.on('zoomend', updateAllMarkerSizes);
}

export function metersToDegreesLat(m) {
  return m / 111111;
}

export function metersToDegreesLng(m, lat) {
  return m / (111111 * Math.cos(lat * Math.PI / 180));
}

function computeMarkerDimensions(lat, lng) {
  if (!appState.map || typeof appState.map.project !== 'function') {
    return { width: 40, height: 10 };
  }
  const zoom = appState.map.getZoom();
  const center = appState.map.project([lat, lng], zoom);
  const north = appState.map.project([lat + metersToDegreesLat(1), lng], zoom);
  const east = appState.map.project([
    lat,
    lng + metersToDegreesLng(4, lat)
  ], zoom);
  const height = Math.abs(north.y - center.y);
  const width = Math.abs(east.x - center.x);
  return { width, height };
}

export function createLabelIcon(labelText, locId, latLng) {
  const displayLabel = labelText && labelText.trim() !== ''
    ? labelText.substring(0, 15)
    : '📍';
  const wiggleClass = appState.isInEditMode ? ' wiggle-marker' : '';
  const safe = displayLabel.replace(/[<>&'"\\/]/g, c => '&#' + c.charCodeAt(0) + ';');
  const lat = latLng ? latLng.lat : 0;
  const lng = latLng ? latLng.lng : 0;
  const { width, height } = computeMarkerDimensions(lat, lng);
  const style = `style="width:${width}px;height:${height}px;line-height:${height}px"`;
  return L.divIcon({
    html: `<div class="custom-label-marker-inner${wiggleClass}" ${style}><div class="custom-label-marker-text">${safe}</div></div>`,
    className: 'custom-label-marker location-marker-' + locId,
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2],
    popupAnchor: [0, -height / 2]
  });
}

export function renderLocationsList() {
  const list = document.getElementById('locationsList');
  const message = document.getElementById('no-locations-message');
  const hasDom = list && message;
  let prevCenter = null;
  let prevZoom = null;
  if (appState.map) {
    prevCenter = appState.map.getCenter();
    prevZoom = appState.map.getZoom();
  }
  if (hasDom) list.innerHTML = '';
  if (appState.markersLayer) appState.markersLayer.clearLayers();
  appState.markers = {};
  if (appState.locations.length === 0) {
    if (hasDom) {
      message.classList.remove('hidden');
      list.classList.add('hidden');
    }
    if (appState.map) appState.map.setView([20, 0], 2);
    return;
  }
  if (hasDom) {
    message.classList.add('hidden');
    list.classList.remove('hidden');
  }
  const bounds = [];
  appState.locations.forEach(loc => {
    if (hasDom) {
      const li = document.createElement('li');
      li.setAttribute('data-id', loc.id);
      li.textContent = loc.label || 'Unnamed';
      list.appendChild(li);
    }
    if (appState.map && appState.markersLayer) {
      const marker = L.marker([loc.lat, loc.lng], {
        icon: createLabelIcon(loc.label, loc.id, { lat: loc.lat, lng: loc.lng }),
        draggable: appState.isInEditMode
      }).addTo(appState.markersLayer);
      applyRoadOrientation(marker);
      marker.locationId = loc.id;
      if (markerClickHandler) marker.on('contextmenu', () => markerClickHandler(loc));
      marker.on('dragend', evt => {
        const m = evt.target.getLatLng();
        const idx = appState.locations.findIndex(l => l.id === loc.id);
        if (idx > -1) {
          appState.locations[idx].lat = m.lat;
          appState.locations[idx].lng = m.lng;
          saveLocations();
        }
        applyRoadOrientation(evt.target);
      });
      appState.markers[loc.id] = marker;
      bounds.push([loc.lat, loc.lng]);
    }
  });
  if (appState.map && bounds.length) {
    if (!renderLocationsList._hasRendered) {
      appState.map.fitBounds(bounds, { padding: [50, 50] });
      renderLocationsList._hasRendered = true;
    } else {
      const center = prevCenter || appState.map.getCenter();
      const zoom = prevZoom || appState.map.getZoom();
      appState.map.setView(center, zoom);
    }
  }
}

export function setMarkerClickHandler(fn) {
  markerClickHandler = fn;
}

export function updateMarkerPosition(id, lat, lng) {
  const marker = appState.markers[id];
  if (marker) {
    marker.setLatLng({ lat, lng });
  }
}

export function updateAllMarkerSizes() {
  if (!appState.map) return;
  appState.locations.forEach(loc => {
    const marker = appState.markers[loc.id];
    if (!marker) return;
    const icon = createLabelIcon(loc.label, loc.id, marker.getLatLng());
    marker.setIcon(icon);
    applyRoadOrientation(marker);
  });
}

export function getBaseLayerNames() {
  return Object.keys(baseLayers);
}

export function getCurrentBaseLayerName() {
  return currentBaseLayerName;
}

export function setBaseLayer(name) {
  if (!baseLayers[name] || name === currentBaseLayerName || !appState.map) return;
  if (currentBaseLayer) appState.map.removeLayer(currentBaseLayer);
  currentBaseLayer = baseLayers[name];
  currentBaseLayer.addTo(appState.map);
  currentBaseLayerName = name;
  localStorage.setItem(PREFERRED_MAP_LAYER_KEY, name);
}

