(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./state'), require('./ui'), require('./storage'));
  } else {
    root.mapModule = factory(root.appState, root.ui, root.storage);
  }
}(typeof self !== 'undefined' ? self : this, function (state, ui, storage) {
  function loadMap() {
    return new Promise((resolve, reject) => {
      try {
        initMap();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  function initMap() {
    state.map = L.map('map').setView([51.505, -0.09], 2);
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 });
    osmLayer.addTo(state.map);
    state.markersLayer = L.layerGroup().addTo(state.map);
  }

  function createLabelIcon(labelText, locId) {
    const displayLabel = labelText && labelText.trim() !== '' ? labelText.substring(0, 15) : '📍';
    return L.divIcon({
      html: `<div class="custom-label-marker-text">${displayLabel.replace(/[<>&'"\\/]/g, c => '&#' + c.charCodeAt(0) + ';')}</div>`,
      className: 'custom-label-marker location-marker-' + locId,
      iconSize: null,
      iconAnchor: [20, 10],
      popupAnchor: [0, -10]
    });
  }

  function renderLocationsList() {
    const list = document.getElementById('locationsList');
    const message = document.getElementById('no-locations-message');
    if (!list || !message) return;
    list.innerHTML = '';
    if (state.markersLayer) state.markersLayer.clearLayers();
    if (state.locations.length === 0) {
      message.classList.remove('hidden');
      list.classList.add('hidden');
      if (state.map) state.map.setView([20, 0], 2);
      return;
    }
    message.classList.add('hidden');
    list.classList.remove('hidden');
    const bounds = [];
    state.locations.forEach(loc => {
      const li = document.createElement('li');
      li.setAttribute('data-id', loc.id);
      li.textContent = loc.label || 'Unnamed';
      list.appendChild(li);
      if (state.map && state.markersLayer) {
        const marker = L.marker([loc.lat, loc.lng], { icon: createLabelIcon(loc.label, loc.id), draggable: state.isInEditMode }).addTo(state.markersLayer);
        marker.locationId = loc.id;
        bounds.push([loc.lat, loc.lng]);
      }
    });
    if (state.map && bounds.length) state.map.fitBounds(bounds, { padding: [50, 50] });
  }

  return { loadMap, initMap, createLabelIcon, renderLocationsList };
}));
