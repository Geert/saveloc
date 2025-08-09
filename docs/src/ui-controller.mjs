import * as locationModel from "./locations.mjs";
import appState from "./state.mjs";
import * as storage from "./storage.mjs";
import { showNotification } from "./ui.mjs";
import * as mapModule from "./map.mjs";
import { requestLocationPermission } from "./permission.mjs";
import { t } from "../i18n.mjs";

  async function fetchNearestRoadBearing(lat, lng) {
    const query = `[out:json];way(around:30,${lat},${lng})[highway];out geom;`;
    const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.elements && data.elements.length) {
        let bestAngle = 0;
        let bestDist = Infinity;
        data.elements.forEach(el => {
          if (!el.geometry || el.geometry.length < 2) return;
          for (let i = 0; i < el.geometry.length - 1; i++) {
            const p0 = el.geometry[i];
            const p1 = el.geometry[i + 1];
            const dy = p1.lat - p0.lat;
            const dx = (p1.lon - p0.lon) * Math.cos((p0.lat * Math.PI) / 180);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const dist = Math.hypot((p0.lat + p1.lat) / 2 - lat, (p0.lon + p1.lon) / 2 - lng);
            if (dist < bestDist) {
              bestDist = dist;
              bestAngle = angle;
            }
          }
        });
        return bestAngle;
      }
    } catch (e) {
      // ignore errors
    }
    return 0;
  }

  async function autoRotateZeroLocations() {
    for (const loc of appState.locations) {
      if (!loc.rotation || loc.rotation === 0) {
        loc.rotation = await fetchNearestRoadBearing(loc.lat, loc.lng);
      }
    }
  }

  function showAddForm(data = {}) {
    const section = document.getElementById('location-form-section');
    const idInput = document.getElementById('locationId');
    const labelInput = document.getElementById('locationLabel');
    const latInput = document.getElementById('locationLat');
    const lngInput = document.getElementById('locationLng');
    const rotInput = document.getElementById('locationRotation');
    if (!section) return;
    showAddForm.lastFocus = document.activeElement;
    idInput.value = data.id || '';
    labelInput.value = data.label || '';
    latInput.value = data.lat || '';
    lngInput.value = data.lng || '';
    if (rotInput) rotInput.value = data.rotation || 0;
    section.classList.remove('hidden');
    labelInput.focus();
  }

  function hideAddForm() {
    const section = document.getElementById('location-form-section');
    if (section) section.classList.add('hidden');
    if (showAddForm.lastFocus) showAddForm.lastFocus.focus();
  }

  function showEditForm(loc) {
    const drawer = document.getElementById('bottom-drawer');
    const drawerContent = document.getElementById('drawer-main-content');
    const editSection = document.getElementById('edit-form-drawer-section');
    const idField = document.getElementById('editLocationIdDrawer');
    const labelField = document.getElementById('editLocationLabelDrawer');
    const latField = document.getElementById('editLocationLatDrawer');
    const lngField = document.getElementById('editLocationLngDrawer');
    const rotField = document.getElementById('editLocationRotDrawer');
    if (!drawer || !editSection) return;
    showEditForm.lastFocus = document.activeElement;
    showEditForm.currentId = loc.id;
    drawer.classList.add('visible');
    if (drawerContent) drawerContent.classList.add('hidden');
    editSection.classList.remove('hidden');
    idField.value = loc.id;
    labelField.value = loc.label || '';
    latField.value = loc.lat;
    lngField.value = loc.lng;
    if (rotField) rotField.value = loc.rotation || 0;
    labelField.focus();
  }

  function hideEditForm() {
    const drawer = document.getElementById('bottom-drawer');
    const drawerContent = document.getElementById('drawer-main-content');
    const editSection = document.getElementById('edit-form-drawer-section');
    if (!drawer || !editSection) return;
    editSection.classList.add('hidden');
    if (drawerContent) drawerContent.classList.remove('hidden');
    if (showEditForm.lastFocus) showEditForm.lastFocus.focus();
    showEditForm.currentId = null;
  }


  function toggleDrawer() {
    const drawer = document.getElementById('bottom-drawer');
    const closeBtn = document.getElementById('closeDrawerBtn');
    if (!drawer) return;
    const willOpen = !drawer.classList.contains('visible');
    if (willOpen) {
      toggleDrawer.lastFocus = document.activeElement;
      drawer.classList.add('visible');
      if (closeBtn) closeBtn.focus();
    } else {
      drawer.classList.remove('visible');
      if (toggleDrawer.lastFocus) toggleDrawer.lastFocus.focus();
      hideEditForm();
    }
    if (appState.map) setTimeout(() => appState.map.invalidateSize(), 300);
  }

  function closeDrawer() {
    const drawer = document.getElementById('bottom-drawer');
    if (!drawer) return;
    drawer.classList.remove('visible');
    hideEditForm();
    if (toggleDrawer.lastFocus) toggleDrawer.lastFocus.focus();
    if (appState.map) setTimeout(() => appState.map.invalidateSize(), 300);
  }

  function toggleEditMode() {
    appState.isInEditMode = !appState.isInEditMode;
    const editModeBtn = document.getElementById('editModeBtn');
    if (editModeBtn) {
      const key = appState.isInEditMode ? 'exit_edit_mode' : 'enter_edit_mode';
      editModeBtn.textContent = t(key);
      editModeBtn.setAttribute('aria-label', t(key));
    }
    mapModule.renderLocationsList();
  }

  function handleAddLocationClick() {
    const addBtn = document.getElementById('addLocationBtn');
    if (!navigator.geolocation) {
      const nextLabel = (appState.locations.length + 1).toString();
      showNotification(t('geolocation_unsupported'), 'error');
      showAddForm({ label: nextLabel });
      return;
    }
    addBtn.disabled = true;
    addBtn.textContent = t('fetching');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const nextLabel = (appState.locations.length + 1).toString();
        showAddForm({
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
          label: nextLabel
        });
        addBtn.disabled = false;
        addBtn.textContent = t('add_location');
      },
      err => {
        showNotification(t('error_getting_current', { error: err.message }), 'error');
        const nextLabel = (appState.locations.length + 1).toString();
        showAddForm({ label: nextLabel });
        addBtn.disabled = false;
        addBtn.textContent = t('add_location');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function saveEditedLocation() {
    const idField = document.getElementById('editLocationIdDrawer');
    const labelField = document.getElementById('editLocationLabelDrawer');
    const latField = document.getElementById('editLocationLatDrawer');
    const lngField = document.getElementById('editLocationLngDrawer');
    const rotField = document.getElementById('editLocationRotDrawer');
    const id = idField.value;
    const index = appState.locations.findIndex(l => l.id === id);
    if (index > -1) {
      appState.locations[index] = {
        ...appState.locations[index],
        label: labelField.value.trim(),
        lat: parseFloat(latField.value),
        lng: parseFloat(lngField.value),
        rotation: parseFloat(rotField.value)
      };
      storage.saveLocations();
      mapModule.renderLocationsList();
    }
    closeDrawer();
  }

  function updateEditLocationToCurrent() {
    const latField = document.getElementById('editLocationLatDrawer');
    const lngField = document.getElementById('editLocationLngDrawer');
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      latField.value = pos.coords.latitude.toFixed(6);
      lngField.value = pos.coords.longitude.toFixed(6);
      handleCoordinateInput();
    });
  }

  function handleCoordinateInput() {
    if (!showEditForm.currentId) return;
    const lat = parseFloat(document.getElementById('editLocationLatDrawer').value);
    const lng = parseFloat(document.getElementById('editLocationLngDrawer').value);
    const rot = parseFloat(document.getElementById('editLocationRotDrawer').value);
    if (!isNaN(lat) && !isNaN(lng) && !isNaN(rot)) {
      mapModule.updateMarkerPosition(showEditForm.currentId, lat, lng, rot);
    }
  }

  function populateLayerSelect() {
    const select = document.getElementById('mapLayerSelect');
    if (!select) return;
    const names = mapModule.getBaseLayerNames();
    select.innerHTML = '';
    names.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      select.appendChild(opt);
    });
    select.value = mapModule.getCurrentBaseLayerName();
  }

  function addOrUpdateLocation() {
    const labelInput = document.getElementById('locationLabel');
    const latInput = document.getElementById('locationLat');
    const lngInput = document.getElementById('locationLng');
    const rotInput = document.getElementById('locationRotation');
    const label = labelInput.value.trim();
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    const rotation = parseFloat(rotInput.value);
    if (!label || isNaN(lat) || isNaN(lng) || isNaN(rotation)) {
      showNotification(t('invalid_input'), 'error');
      return;
    }
    const newLocation = {
      id: Date.now().toString(),
      label,
      lat,
      lng,
      rotation,
      timestamp: new Date().toISOString()
    };
    appState.locations.push(newLocation);
    storage.saveLocations();
    mapModule.renderLocationsList();
    hideAddForm();
  }

  function clearAllLocations() {
    closeDrawer();
    if (appState.locations.length === 0) {
      showNotification(t('no_locations_to_clear'), 'info');
      return;
    }
    if (confirm(t('confirm_delete_all'))) {
      appState.locations = [];
      storage.saveLocations();
      mapModule.renderLocationsList();
    }
  }

  function exportToXml() {
    closeDrawer();
    if (appState.locations.length === 0) {
      showNotification(t('no_locations_to_export'), 'info');
      return;
    }
    const xmlDoc = document.implementation.createDocument(null, 'root', null);
    appState.locations.forEach((loc, index) => {
      const plaats = xmlDoc.createElement('plaatsen');
      const id = xmlDoc.createElement('id');
      id.textContent = loc.id || index;
      plaats.appendChild(id);
      const lat = xmlDoc.createElement('lat');
      lat.textContent = loc.lat;
      plaats.appendChild(lat);
      const lng = xmlDoc.createElement('lng');
      lng.textContent = loc.lng;
      plaats.appendChild(lng);
      const label = xmlDoc.createElement('label');
      label.textContent = loc.label || '';
      plaats.appendChild(label);
      const rotation = xmlDoc.createElement('rotation');
      rotation.textContent = loc.rotation || 0;
      plaats.appendChild(rotation);
      xmlDoc.documentElement.appendChild(plaats);
    });
    const serializer = new XMLSerializer();
    const xmlString = '<?xml version="1.0" encoding="UTF-16" standalone="no"?>\n' +
      serializer.serializeToString(xmlDoc);
    const blob = new Blob([xmlString], { type: 'application/xml;charset=utf-16' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'saveloc_export.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function forceRefresh() {
    if (!navigator.onLine) {
      showNotification(t('no_internet'), 'error');
      return;
    }
    if (window.caches && caches.keys) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => {
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(reg => reg.unregister());
            window.location.reload(true);
          });
        } else {
          window.location.reload(true);
        }
      });
    } else {
      window.location.reload(true);
    }
  }

  function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    return new Promise(resolve => {
      reader.onload = async function(e) {
        try {
          const xmlString = e.target.result;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
          const errorNode = xmlDoc.querySelector('parsererror');
          if (errorNode) {
            showNotification(t('error_parsing_xml'), 'error');
            return;
          }
          const plaatsElements = xmlDoc.getElementsByTagName('plaatsen');
          if (plaatsElements.length === 0) {
            showNotification(t('no_locations_in_file'), 'info');
            return;
          }
          appState.locations = [];
          let importedCount = 0;
          for (let i = 0; i < plaatsElements.length; i++) {
            const plaats = plaatsElements[i];
            const idNode = plaats.getElementsByTagName('id')[0];
            const latNode = plaats.getElementsByTagName('lat')[0];
            const lngNode = plaats.getElementsByTagName('lng')[0];
            const labelNode = plaats.getElementsByTagName('label')[0];
            const rotNode = plaats.getElementsByTagName('rotation')[0];
            if (idNode && latNode && lngNode) {
              const lat = parseFloat(latNode.textContent);
              const lng = parseFloat(lngNode.textContent);
              let label = labelNode ? labelNode.textContent : '';
              const rotation = rotNode ? parseFloat(rotNode.textContent) : 0;
              if (isNaN(lat) || isNaN(lng)) continue;
              if (!label && idNode.textContent) label = idNode.textContent;
              appState.locations.push({ id: Date.now().toString() + '_' + i, label, lat, lng, rotation, timestamp: new Date().toISOString() });
              importedCount++;
            }
          }
          if (importedCount > 0) {
            await autoRotateZeroLocations();
            storage.saveLocations();
            mapModule.renderLocationsList();
            showNotification(t('locations_imported', { count: importedCount }), 'success');
          }
        } catch (error) {
          showNotification(t('an_error_occurred'), 'error');
        }
        event.target.value = null;
        closeDrawer();
        resolve();
      };
      reader.onerror = function() {
        showNotification(t('error_reading_file'), 'error');
        event.target.value = null;
        resolve();
      };
      reader.readAsText(file);
    });
  }

  function adjustRotation(inputId, delta) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const current = parseFloat(input.value) || 0;
    let next = (current + delta) % 360;
    if (next < 0) next += 360;
    input.value = next;
    input.dispatchEvent(new Event('input'));
  }

  function attachEventListeners() {
    const saveLocationBtn = document.getElementById('saveLocationBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const clearListBtn = document.getElementById('clearListBtn');
    const exportXmlBtn = document.getElementById('exportXmlBtn');
    const addLocationBtn = document.getElementById('addLocationBtn');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const editModeBtn = document.getElementById('editModeBtn');
    const saveLocationDrawerBtn = document.getElementById('saveLocationDrawerBtn');
    const cancelEditDrawerBtn = document.getElementById('cancelEditDrawerBtn');
    const updateLocationToCurrentBtn = document.getElementById('updateLocationToCurrentBtn');
    const editLocationLatDrawer = document.getElementById('editLocationLatDrawer');
    const editLocationLngDrawer = document.getElementById('editLocationLngDrawer');
    const editLocationRotDrawer = document.getElementById('editLocationRotDrawer');
    const rotateLeftAddBtn = document.getElementById('rotateLeftAddBtn');
    const rotateRightAddBtn = document.getElementById('rotateRightAddBtn');
    const rotateLeftDrawerBtn = document.getElementById('rotateLeftDrawerBtn');
    const rotateRightDrawerBtn = document.getElementById('rotateRightDrawerBtn');
    const importXmlBtnTrigger = document.getElementById('importXmlBtnTrigger');
    const importXmlInput = document.getElementById('importXmlInput');
    const forceRefreshBtn = document.getElementById('forceRefreshBtn');
    const mapLayerSelect = document.getElementById('mapLayerSelect');

    if (saveLocationBtn) saveLocationBtn.addEventListener('click', addOrUpdateLocation);
    if (cancelFormBtn) cancelFormBtn.addEventListener('click', hideAddForm);
    if (clearListBtn) clearListBtn.addEventListener('click', clearAllLocations);
    if (exportXmlBtn) exportXmlBtn.addEventListener('click', exportToXml);
    if (addLocationBtn) addLocationBtn.addEventListener('click', handleAddLocationClick);
    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleDrawer);
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if (editModeBtn) editModeBtn.addEventListener('click', toggleEditMode);
    if (saveLocationDrawerBtn) saveLocationDrawerBtn.addEventListener('click', saveEditedLocation);
    if (cancelEditDrawerBtn) cancelEditDrawerBtn.addEventListener('click', closeDrawer);
    if (updateLocationToCurrentBtn) updateLocationToCurrentBtn.addEventListener('click', updateEditLocationToCurrent);
    if (editLocationLatDrawer) editLocationLatDrawer.addEventListener('input', handleCoordinateInput);
    if (editLocationLngDrawer) editLocationLngDrawer.addEventListener('input', handleCoordinateInput);
    if (editLocationRotDrawer) editLocationRotDrawer.addEventListener('input', handleCoordinateInput);
    if (rotateLeftAddBtn) rotateLeftAddBtn.addEventListener('click', () => adjustRotation('locationRotation', -15));
    if (rotateRightAddBtn) rotateRightAddBtn.addEventListener('click', () => adjustRotation('locationRotation', 15));
    if (rotateLeftDrawerBtn) rotateLeftDrawerBtn.addEventListener('click', () => adjustRotation('editLocationRotDrawer', -15));
    if (rotateRightDrawerBtn) rotateRightDrawerBtn.addEventListener('click', () => adjustRotation('editLocationRotDrawer', 15));
    if (importXmlBtnTrigger && importXmlInput) {
      importXmlBtnTrigger.addEventListener('click', () => {
        closeDrawer();
        importXmlInput.click();
      });
      importXmlInput.addEventListener('change', handleFileImport);
    }



   if (forceRefreshBtn) forceRefreshBtn.addEventListener('click', () => {
     closeDrawer();
     forceRefresh();
   });

    if (mapLayerSelect) mapLayerSelect.addEventListener('change', e => {
      mapModule.setBaseLayer(e.target.value);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDrawer();
    });

    document.addEventListener('click', e => {
      const drawer = document.getElementById('bottom-drawer');
      if (!drawer || !drawer.classList.contains('visible')) return;
      if (!drawer.contains(e.target) && e.target !== hamburgerBtn) {
        closeDrawer();
      }
    });

  }

  function init() {
    locationModel.loadLocations();
    attachEventListeners();
    mapModule.setMarkerClickHandler(showEditForm);
    mapModule.loadMap().then(() => {
      mapModule.renderLocationsList();
      populateLayerSelect();
      requestLocationPermission();
    });
  }

  const testApi = {
    setLocations: locationModel.setLocations,
    getLocations: locationModel.getLocations,
    loadLocations: locationModel.loadLocations,
    saveLocations: locationModel.saveLocations,
    showNotification: showNotification,
    exportToXml,
    requestLocationPermission: requestLocationPermission,
    createLabelIcon: mapModule.createLabelIcon,
    addOrUpdateLocation,
    clearAllLocations,
    handleFileImport,
    renderLocationsList: mapModule.renderLocationsList,
    showAddForm,
    hideAddForm,
    showEditForm,
    hideEditForm,
    toggleDrawer,
    closeDrawer,
    updateMarkerPosition: mapModule.updateMarkerPosition,
    setBaseLayer: mapModule.setBaseLayer,
    getBaseLayerNames: mapModule.getBaseLayerNames,
    getCurrentBaseLayerName: mapModule.getCurrentBaseLayerName,
    forceRefresh
  };

export default { init, testApi };
