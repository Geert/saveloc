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

// Placeholder orientation logic. In a full implementation this would fetch the
// nearest road and calculate its bearing so markers can rotate parallel to it.
export async function getRoadOrientation(lat, lng) {
  // Network access to road data is blocked in the current environment.
  // Returning 0 degrees until road orientation can be determined.
  return 0;
}

export async function applyRoadOrientation(marker) {
  const { lat, lng } = marker.getLatLng();
  const angle = await getRoadOrientation(lat, lng);
  if (marker._icon) {
    marker._icon.style.transform = `rotate(${angle}deg)`;
  }
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
}

export function createLabelIcon(labelText, locId) {
  const displayLabel = labelText && labelText.trim() !== '' ? labelText.substring(0, 15) : '📍';
  const wiggleClass = appState.isInEditMode ? ' wiggle-marker' : '';
  return L.divIcon({
    html: `<div class="custom-label-marker-text${wiggleClass}">${displayLabel.replace(/[<>&'"\\/]/g, c => '&#' + c.charCodeAt(0) + ';')}</div>`,
    className: 'custom-label-marker location-marker-' + locId,
    iconSize: null,
    iconAnchor: [20, 10],
    popupAnchor: [0, -10]
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
        icon: createLabelIcon(loc.label, loc.id),
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

