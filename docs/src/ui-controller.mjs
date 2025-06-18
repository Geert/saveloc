import * as locationModel from "./locations.mjs";
import appState from "./state.mjs";
import * as storage from "./storage.mjs";
import { showNotification } from "./ui.mjs";
import * as mapModule from "./map.mjs";
import { requestLocationPermission } from "./permission.mjs";
import { t } from "../i18n.mjs";

  function showAddForm(data = {}) {
    const section = document.getElementById('location-form-section');
    const idInput = document.getElementById('locationId');
    const labelInput = document.getElementById('locationLabel');
    const latInput = document.getElementById('locationLat');
    const lngInput = document.getElementById('locationLng');
    if (!section) return;
    showAddForm.lastFocus = document.activeElement;
    idInput.value = data.id || '';
    labelInput.value = data.label || '';
    latInput.value = data.lat || '';
    lngInput.value = data.lng || '';
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

  function showSavedLocations() {
    const section = document.getElementById('saved-locations-section');
    if (!section) return;
    showSavedLocations.lastFocus = document.activeElement;
    mapModule.renderLocationsList();
    section.classList.remove('hidden');
    const closeBtn = document.getElementById('closeSavedLocationsBtn');
    if (closeBtn) closeBtn.focus();
  }

  function hideSavedLocations() {
    const section = document.getElementById('saved-locations-section');
    if (section) section.classList.add('hidden');
    if (showSavedLocations.lastFocus) showSavedLocations.lastFocus.focus();
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
    const id = idField.value;
    const index = appState.locations.findIndex(l => l.id === id);
    if (index > -1) {
      appState.locations[index] = {
        ...appState.locations[index],
        label: labelField.value.trim(),
        lat: parseFloat(latField.value),
        lng: parseFloat(lngField.value)
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
    if (!isNaN(lat) && !isNaN(lng)) {
      mapModule.updateMarkerPosition(showEditForm.currentId, lat, lng);
    }
  }

  function addOrUpdateLocation() {
    const labelInput = document.getElementById('locationLabel');
    const latInput = document.getElementById('locationLat');
    const lngInput = document.getElementById('locationLng');
    const label = labelInput.value.trim();
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    if (!label || isNaN(lat) || isNaN(lng)) {
      showNotification(t('invalid_input'), 'error');
      return;
    }
    const newLocation = {
      id: Date.now().toString(),
      label,
      lat,
      lng,
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
    reader.onload = function(e) {
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
          if (idNode && latNode && lngNode) {
            const lat = parseFloat(latNode.textContent);
            const lng = parseFloat(lngNode.textContent);
            let label = labelNode ? labelNode.textContent : '';
            if (isNaN(lat) || isNaN(lng)) continue;
            if (!label && idNode.textContent) label = idNode.textContent;
            appState.locations.push({ id: Date.now().toString() + '_' + i, label, lat, lng, timestamp: new Date().toISOString() });
            importedCount++;
          }
        }
        if (importedCount > 0) {
          storage.saveLocations();
          mapModule.renderLocationsList();
          showNotification(t('locations_imported', { count: importedCount }), 'success');
        }
      } catch (error) {
        showNotification(t('an_error_occurred'), 'error');
      }
      event.target.value = null;
      closeDrawer();
    };
    reader.onerror = function() {
      showNotification(t('error_reading_file'), 'error');
      event.target.value = null;
    };
    reader.readAsText(file);
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
   const importXmlBtnTrigger = document.getElementById('importXmlBtnTrigger');
   const importXmlInput = document.getElementById('importXmlInput');
   const locationsListUL = document.getElementById('locationsList');
    const viewSavedLocationsBtn = document.getElementById('viewSavedLocationsBtn');
    const forceRefreshBtn = document.getElementById('forceRefreshBtn');
    const closeSavedLocationsBtn = document.getElementById('closeSavedLocationsBtn');

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
    if (importXmlBtnTrigger && importXmlInput) {
      importXmlBtnTrigger.addEventListener('click', () => {
        closeDrawer();
        importXmlInput.click();
      });
      importXmlInput.addEventListener('change', handleFileImport);
    }

    if (viewSavedLocationsBtn) viewSavedLocationsBtn.addEventListener('click', () => {
      closeDrawer();
      showSavedLocations();
    });
    if (closeSavedLocationsBtn) closeSavedLocationsBtn.addEventListener('click', hideSavedLocations);

    if (forceRefreshBtn) forceRefreshBtn.addEventListener('click', () => {
      closeDrawer();
      forceRefresh();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDrawer();
    });

    if (locationsListUL) {
      locationsListUL.addEventListener('click', e => {
        const li = e.target.closest('li[data-id]');
        if (!li) return;
        const loc = appState.locations.find(l => l.id === li.dataset.id);
        if (loc) showEditForm(loc);
      });
    }
  }

  function init() {
    locationModel.loadLocations();
    attachEventListeners();
    mapModule.setMarkerClickHandler(showEditForm);
    mapModule.loadMap().then(() => {
      mapModule.renderLocationsList();
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
    showSavedLocations,
    hideSavedLocations,
    toggleDrawer,
    closeDrawer,
    updateMarkerPosition: mapModule.updateMarkerPosition,
    forceRefresh
  };

export default { init, testApi };
