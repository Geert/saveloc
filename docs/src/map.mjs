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
  return L.divIcon({
    html: `<div class="custom-label-marker-text">${displayLabel.replace(/[<>&'"\\/]/g, c => '&#' + c.charCodeAt(0) + ';')}</div>` ,
    className: 'custom-label-marker location-marker-' + locId,
    iconSize: null,
    iconAnchor: [20, 10],
    popupAnchor: [0, -10]
  });
}

function meterOffset(lat, lng, dx, dy) {
  const R = 6378137;
  const newLat = lat + (dy / R) * (180 / Math.PI);
  const newLng = lng + (dx / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
  return [newLat, newLng];
}

function getStallCorners(lat, lng, rotation = 0) {
  const halfLength = 2; // meters (4m total)
  const halfWidth = 0.5; // meters (1m total)
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const pts = [
    [-halfLength, -halfWidth],
    [halfLength, -halfWidth],
    [halfLength, halfWidth],
    [-halfLength, halfWidth]
  ];
  return pts.map(([x, y]) => {
    const dx = x * cos - y * sin;
    const dy = x * sin + y * cos;
    const [nlat, nlng] = meterOffset(lat, lng, dx, dy);
    return { lat: nlat, lng: nlng };
  });
}

function computeRotation(latlngs) {
  if (!latlngs || latlngs.length < 2) return 0;
  const p0 = latlngs[0];
  const p1 = latlngs[1];
  const dy = p1.lat - p0.lat;
  const dx = (p1.lng - p0.lng) * Math.cos((p0.lat * Math.PI) / 180);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return angle;
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
      const corners = getStallCorners(loc.lat, loc.lng, loc.rotation || 0);
      const poly = L.polygon(corners, {
        color: 'orange',
        draggable: appState.isInEditMode
      }).addTo(appState.markersLayer);
      poly.locationId = loc.id;
      if (poly.transform && appState.isInEditMode) {
        poly.transform.enable({ rotation: true, draggable: true, scaling: false });
      }
      if (markerClickHandler) poly.on('contextmenu', () => markerClickHandler(loc));
      const updateFromPoly = evt => {
        const p = evt.target;
        const center = p.getBounds().getCenter();
        const idx = appState.locations.findIndex(l => l.id === loc.id);
        if (idx > -1) {
          appState.locations[idx].lat = center.lat;
          appState.locations[idx].lng = center.lng;
          const latlngs = p.getLatLngs()[0] || [];
          appState.locations[idx].rotation = computeRotation(latlngs);
          saveLocations();
        }
      };
      poly.on('dragend', updateFromPoly);
      poly.on('transformend', updateFromPoly);
      appState.markers[loc.id] = poly;
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

export function updateMarkerPosition(id, lat, lng, rotation = 0) {
  const poly = appState.markers[id];
  if (poly) {
    const corners = getStallCorners(lat, lng, rotation);
    poly.setLatLngs(corners);
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
