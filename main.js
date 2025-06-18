// Main entry point
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const state = window.appState;
    const storage = window.storage;
    const ui = window.ui;
    const mapModule = window.mapModule;
    const permission = window.permission;

    const addLocationBtn = document.getElementById('addLocationBtn');
    const clearListBtn = document.getElementById('clearListBtn');
    const exportXmlBtn = document.getElementById('exportXmlBtn');
    const saveLocationBtn = document.getElementById('saveLocationBtn');
    const locationFormSection = document.getElementById('location-form-section');
    const locationLabelInput = document.getElementById('locationLabel');
    const locationLatInput = document.getElementById('locationLat');
    const locationLngInput = document.getElementById('locationLng');
    const locationIdInput = document.getElementById('locationId');
    const cancelFormBtn = document.getElementById('cancelFormBtn');

    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bottomDrawer = document.getElementById('bottom-drawer');
    const editModeBtn = document.getElementById('editModeBtn');
    const drawerContent = document.getElementById('drawer-main-content');
    const editFormDrawerSection = document.getElementById('edit-form-drawer-section');
    const editLocationIdDrawer = document.getElementById('editLocationIdDrawer');
    const editLocationLabelDrawer = document.getElementById('editLocationLabelDrawer');
    const editLocationLatDrawer = document.getElementById('editLocationLatDrawer');
    const editLocationLngDrawer = document.getElementById('editLocationLngDrawer');
    const saveLocationDrawerBtn = document.getElementById('saveLocationDrawerBtn');
    const cancelEditDrawerBtn = document.getElementById('cancelEditDrawerBtn');
    const updateLocationToCurrentBtn = document.getElementById('updateLocationToCurrentBtn');
    const locationsListUL = document.getElementById('locationsList');

    const importXmlBtnTrigger = document.getElementById('importXmlBtnTrigger');
    const importXmlInput = document.getElementById('importXmlInput');

    function setLocations(arr) { state.locations = arr; }
    function getLocations() { return state.locations; }

    function showAddForm(data = {}) {
      if (!locationFormSection) return;
      locationIdInput.value = data.id || '';
      locationLabelInput.value = data.label || '';
      locationLatInput.value = data.lat || '';
      locationLngInput.value = data.lng || '';
      locationFormSection.classList.remove('hidden');
    }

    function hideAddForm() {
      if (locationFormSection) locationFormSection.classList.add('hidden');
    }

    function showEditForm(loc) {
      if (!bottomDrawer || !editFormDrawerSection) return;
      bottomDrawer.classList.add('visible');
      if (drawerContent) drawerContent.classList.add('hidden');
      editFormDrawerSection.classList.remove('hidden');
      editLocationIdDrawer.value = loc.id;
      editLocationLabelDrawer.value = loc.label || '';
      editLocationLatDrawer.value = loc.lat;
      editLocationLngDrawer.value = loc.lng;
    }

    function hideEditForm() {
      if (!bottomDrawer || !editFormDrawerSection) return;
      editFormDrawerSection.classList.add('hidden');
      if (drawerContent) drawerContent.classList.remove('hidden');
    }

    function toggleDrawer() {
      if (!bottomDrawer) return;
      bottomDrawer.classList.toggle('visible');
      if (state.map) setTimeout(() => state.map.invalidateSize(), 300);
    }

    function toggleEditMode() {
      state.isInEditMode = !state.isInEditMode;
      if (editModeBtn) {
        editModeBtn.textContent = state.isInEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode';
      }
      mapModule.renderLocationsList();
    }

    function handleAddLocationClick() {
      if (!navigator.geolocation) {
        const nextLabel = (state.locations.length + 1).toString();
        ui.showNotification('Geolocation is not supported by your browser', 'error');
        showAddForm({ label: nextLabel });
        return;
      }
      addLocationBtn.disabled = true;
      addLocationBtn.textContent = 'Fetching...';
      navigator.geolocation.getCurrentPosition(
        pos => {
          const nextLabel = (state.locations.length + 1).toString();
          showAddForm({
            lat: pos.coords.latitude.toFixed(6),
            lng: pos.coords.longitude.toFixed(6),
            label: nextLabel
          });
          addLocationBtn.disabled = false;
          addLocationBtn.textContent = 'Add Location';
        },
        err => {
          ui.showNotification(`Error getting current location: ${err.message}`, 'error');
          const nextLabel = (state.locations.length + 1).toString();
          showAddForm({ label: nextLabel });
          addLocationBtn.disabled = false;
          addLocationBtn.textContent = 'Add Location';
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    function saveEditedLocation() {
      const id = editLocationIdDrawer.value;
      const index = state.locations.findIndex(l => l.id === id);
      if (index > -1) {
        state.locations[index] = {
          ...state.locations[index],
          label: editLocationLabelDrawer.value.trim(),
          lat: parseFloat(editLocationLatDrawer.value),
          lng: parseFloat(editLocationLngDrawer.value)
        };
        storage.saveLocations();
        mapModule.renderLocationsList();
      }
      hideEditForm();
    }

    function updateEditLocationToCurrent() {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(pos => {
        editLocationLatDrawer.value = pos.coords.latitude.toFixed(6);
        editLocationLngDrawer.value = pos.coords.longitude.toFixed(6);
      });
    }

    function addOrUpdateLocation(context = 'new') {
      const label = locationLabelInput.value.trim();
      const lat = parseFloat(locationLatInput.value);
      const lng = parseFloat(locationLngInput.value);
      if (!label || isNaN(lat) || isNaN(lng)) {
        ui.showNotification('Invalid input', 'error');
        return;
      }
      const newLocation = {
        id: Date.now().toString(),
        label,
        lat,
        lng,
        timestamp: new Date().toISOString()
      };
      state.locations.push(newLocation);
      storage.saveLocations();
      mapModule.renderLocationsList();
      hideAddForm();
    }

    function clearAllLocations() {
      if (state.locations.length === 0) {
        ui.showNotification('There are no locations to clear.', 'info');
        return;
      }
      if (confirm('Are you sure you want to delete ALL locations? This cannot be undone.')) {
        state.locations = [];
        storage.saveLocations();
        mapModule.renderLocationsList();
      }
    }

    function exportToXml() {
      if (state.locations.length === 0) {
        ui.showNotification('No locations to export.', 'info');
        return;
      }
      let xmlString = '<?xml version="1.0" encoding="UTF-16" standalone="no"?>\n<root>\n';
      state.locations.forEach((loc, index) => {
        xmlString += '  <plaatsen>\n';
        xmlString += `    <id>${loc.id || index}</id>\n`;
        xmlString += `    <lat>${loc.lat}</lat>\n`;
        xmlString += `    <lng>${loc.lng}</lng>\n`;
        const escapedLabel = loc.label ? loc.label.replace(/[<>&'\"]/g, c => '&#' + c.charCodeAt(0) + ';') : '';
        xmlString += `    <label>${escapedLabel}</label>\n`;
        xmlString += '  </plaatsen>\n';
      });
      xmlString += '</root>';
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
            ui.showNotification('Error parsing XML file. Please check the file format.', 'error');
            return;
          }
          const plaatsElements = xmlDoc.getElementsByTagName('plaatsen');
          if (plaatsElements.length === 0) {
            ui.showNotification('No locations found in the XML file.', 'info');
            return;
          }
          state.locations = [];
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
              state.locations.push({ id: Date.now().toString() + '_' + i, label, lat, lng, timestamp: new Date().toISOString() });
              importedCount++;
            }
          }
          if (importedCount > 0) {
            storage.saveLocations();
            mapModule.renderLocationsList();
            ui.showNotification(`${importedCount} location(s) imported successfully.`, 'success');
          }
        } catch (error) {
          ui.showNotification('An error occurred while processing the XML file.', 'error');
        }
        event.target.value = null;
      };
      reader.onerror = function() {
        ui.showNotification('Error reading file.', 'error');
        event.target.value = null;
      };
      reader.readAsText(file);
    }

    if (saveLocationBtn) saveLocationBtn.addEventListener('click', () => addOrUpdateLocation('new'));
    if (cancelFormBtn) cancelFormBtn.addEventListener('click', hideAddForm);
    if (clearListBtn) clearListBtn.addEventListener('click', clearAllLocations);
    if (exportXmlBtn) exportXmlBtn.addEventListener('click', exportToXml);
    if (addLocationBtn) addLocationBtn.addEventListener('click', handleAddLocationClick);
    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleDrawer);
    if (editModeBtn) editModeBtn.addEventListener('click', toggleEditMode);
    if (saveLocationDrawerBtn) saveLocationDrawerBtn.addEventListener('click', saveEditedLocation);
    if (cancelEditDrawerBtn) cancelEditDrawerBtn.addEventListener('click', hideEditForm);
    if (updateLocationToCurrentBtn) updateLocationToCurrentBtn.addEventListener('click', updateEditLocationToCurrent);
    if (importXmlBtnTrigger && importXmlInput) {
      importXmlBtnTrigger.addEventListener('click', () => importXmlInput.click());
      importXmlInput.addEventListener('change', handleFileImport);
    }

    storage.loadLocations();
    mapModule.setMarkerClickHandler(showEditForm);
    mapModule.loadMap().then(() => {
      mapModule.renderLocationsList();
      permission.requestLocationPermission();
    });

    if (locationsListUL) {
      locationsListUL.addEventListener('click', e => {
        const li = e.target.closest('li[data-id]');
        if (!li) return;
        const loc = state.locations.find(l => l.id === li.dataset.id);
        if (loc) showEditForm(loc);
      });
    }

    window.saveLocTest = {
      setLocations,
      getLocations,
      loadLocations: storage.loadLocations,
      saveLocations: storage.saveLocations,
      showNotification: ui.showNotification,
      exportToXml,
      requestLocationPermission: permission.requestLocationPermission,
      createLabelIcon: mapModule.createLabelIcon,
      addOrUpdateLocation,
      clearAllLocations,
      renderLocationsList: mapModule.renderLocationsList
    };
  });
})();
