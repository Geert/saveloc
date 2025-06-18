/** Map handling and marker rendering */
import appState from './state.mjs';
import { saveLocations } from './storage.mjs';

const PREFERRED_MAP_LAYER_KEY = 'preferredMapLayerName';
let markerClickHandler = null;

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

  const baseMaps = {
    'Satellite': esriSatellite,
    'OpenStreetMap': osmLayer,
    'Carto Light': cartoPositron,
    'Carto Dark': cartoDarkMatter
  };

  const preferredLayerName = localStorage.getItem(PREFERRED_MAP_LAYER_KEY);
  let defaultLayer = osmLayer;
  if (preferredLayerName && baseMaps[preferredLayerName]) {
    defaultLayer = baseMaps[preferredLayerName];
  }
  defaultLayer.addTo(appState.map);

  appState.markersLayer = L.layerGroup().addTo(appState.map);
  const overlayMaps = { 'Locations': appState.markersLayer };
  L.control.layers(baseMaps, overlayMaps).addTo(appState.map);
  appState.map.on('baselayerchange', e => {
    localStorage.setItem(PREFERRED_MAP_LAYER_KEY, e.name);
  });
}

export function createLabelIcon(labelText, locId) {
  const displayLabel = labelText && labelText.trim() !== '' ? labelText.substring(0, 15) : '📍';
  return L.divIcon({
    html: `<div class="custom-label-marker-text">${displayLabel.replace(/[<>&'"\\/]/g, c => '&#' + c.charCodeAt(0) + ';')}</div>`,
    className: 'custom-label-marker location-marker-' + locId,
    iconSize: null,
    iconAnchor: [20, 10],
    popupAnchor: [0, -10]
  });
}

export function renderLocationsList() {
  const list = document.getElementById('locationsList');
  const message = document.getElementById('no-locations-message');
  if (!list || !message) return;
  let prevCenter = null;
  let prevZoom = null;
  if (appState.map) {
    prevCenter = appState.map.getCenter();
    prevZoom = appState.map.getZoom();
  }
  list.innerHTML = '';
  if (appState.markersLayer) appState.markersLayer.clearLayers();
  appState.markers = {};
  if (appState.locations.length === 0) {
    message.classList.remove('hidden');
    list.classList.add('hidden');
    if (appState.map) appState.map.setView([20, 0], 2);
    return;
  }
  message.classList.add('hidden');
  list.classList.remove('hidden');
  const bounds = [];
  appState.locations.forEach(loc => {
    const li = document.createElement('li');
    li.setAttribute('data-id', loc.id);
    li.textContent = loc.label || 'Unnamed';
    list.appendChild(li);
    if (appState.map && appState.markersLayer) {
      const marker = L.marker([loc.lat, loc.lng], {
        icon: createLabelIcon(loc.label, loc.id),
        draggable: appState.isInEditMode
      }).addTo(appState.markersLayer);
      marker.locationId = loc.id;
      if (markerClickHandler) marker.on('click', () => markerClickHandler(loc));
      marker.on('dragend', evt => {
        const m = evt.target.getLatLng();
        const idx = appState.locations.findIndex(l => l.id === loc.id);
        if (idx > -1) {
          appState.locations[idx].lat = m.lat;
          appState.locations[idx].lng = m.lng;
          saveLocations();
        }
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

