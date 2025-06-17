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

    const importXmlBtnTrigger = document.getElementById('importXmlBtnTrigger');
    const importXmlInput = document.getElementById('importXmlInput');

    function setLocations(arr) { state.locations = arr; }
    function getLocations() { return state.locations; }

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
      if (locationFormSection) locationFormSection.classList.add('hidden');
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
    if (cancelFormBtn) cancelFormBtn.addEventListener('click', () => { if (locationFormSection) locationFormSection.classList.add('hidden'); });
    if (clearListBtn) clearListBtn.addEventListener('click', clearAllLocations);
    if (exportXmlBtn) exportXmlBtn.addEventListener('click', exportToXml);
    if (importXmlBtnTrigger && importXmlInput) {
      importXmlBtnTrigger.addEventListener('click', () => importXmlInput.click());
      importXmlInput.addEventListener('change', handleFileImport);
    }

    storage.loadLocations();
    mapModule.loadMap().then(() => {
      mapModule.renderLocationsList();
      permission.requestLocationPermission();
    });

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
