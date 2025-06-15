// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired. Script starting...');
    // --- DOM Elements ---
    const addLocationBtn = document.getElementById('addLocationBtn');
    const clearListBtn = document.getElementById('clearListBtn');
    const exportXmlBtn = document.getElementById('exportXmlBtn');
    const saveLocationBtn = document.getElementById('saveLocationBtn');
    const locationFormSection = document.getElementById('location-form-section');
    const locationForm = document.getElementById('location-form');
    const locationFormTitle = document.getElementById('form-title'); // This is the span inside the h2
    const locationIdInput = document.getElementById('locationId'); // For new locations (modal)
    const locationLabelInput = document.getElementById('locationLabel'); // For new locations (modal)
    const locationLatInput = document.getElementById('locationLat'); // For new locations (modal)
    const locationLngInput = document.getElementById('locationLng'); // For new locations (modal)
    // saveLocationBtn (for modal) is declared on line 8
    const cancelFormBtn = document.getElementById('cancelFormBtn'); // For new locations (modal)

    // Drawer Edit Form Elements
    const editFormDrawerSection = document.getElementById('edit-form-drawer-section');
    const editFormDrawerTitle = document.getElementById('edit-form-drawer-title');
    const editLocationIdDrawerInput = document.getElementById('editLocationIdDrawer');
    const editLocationLabelDrawerInput = document.getElementById('editLocationLabelDrawer');
    const editLocationLatDrawerInput = document.getElementById('editLocationLatDrawer');
    const editLocationLngDrawerInput = document.getElementById('editLocationLngDrawer');
    const saveLocationDrawerBtn = document.getElementById('saveLocationDrawerBtn');
    const cancelEditDrawerBtn = document.getElementById('cancelEditDrawerBtn');
    const updateLocationToCurrentBtn = document.getElementById('updateLocationToCurrentBtn');

    const locationsListUL = document.getElementById('locationsList');
    const noLocationsMessage = document.getElementById('no-locations-message');

    // New UI elements for drawer/menu
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bottomDrawer = document.getElementById('bottom-drawer');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const importXmlBtnTrigger = document.getElementById('importXmlBtnTrigger');
    const importXmlInput = document.getElementById('importXmlInput');
    const drawerContent = document.getElementById('drawer-main-content');
    const editModeBtn = document.getElementById('editModeBtn');

    console.log('Initial DOM selection - editFormDrawerSection:', editFormDrawerSection);
    console.log('Initial DOM selection - drawerContent:', drawerContent);

    // --- App State ---
    let locations = [];

    // --- Notifications ---
    const notificationContainer = document.getElementById('notification-container');

    function showNotification(message, type = 'info', duration = 3000) {
        if (!notificationContainer) {
            console.error('Notification container not found!');
            // Fallback to alert if container is missing
            alert(`${type.toUpperCase()}: ${message}`);
            return;
        }

        const notification = document.createElement('div');
        notification.classList.add('notification', type);
        notification.textContent = message;

        notificationContainer.appendChild(notification);

        // Trigger the animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10); // Small delay to allow element to be added to DOM before animation starts

        // Remove the notification after duration
        setTimeout(() => {
            notification.classList.remove('show');
            // Wait for fade out animation to complete before removing from DOM
            setTimeout(() => {
                if (notification.parentNode === notificationContainer) { // Check if still child
                     notificationContainer.removeChild(notification);
                }
            }, 500); // Matches CSS transition duration
        }, duration);
    }
    let isInEditMode = false; // Tracks if the app is in edit mode for markers

    // --- Map Initialization ---
    let map = null;
    console.log('typeof loadMap after def:', typeof loadMap); // Moved here, after new loadMap def
    let markersLayer = null; // Layer group for markers
    let markers = {}; // To store individual marker instances, keyed by location.id

    function loadMap() {
        return new Promise((resolve, reject) => {
            try {
                initMap(); // Call the existing map initialization logic
                resolve(); // Resolve the promise once initMap is done
            } catch (error) {
                console.error("Error initializing map in loadMap:", error);
                reject(error); // Reject if initMap throws an error
            }
        });
    }

    function initMap() {
        map = L.map('map').setView([51.505, -0.09], 2); // Default view
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 20
        });

        const cartoPositron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        });

        const cartoDarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        });

        const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 20
        });

        // Define baseMaps first to check preferred layer
        const baseMaps = {
            "Satellite": esriSatellite,
            "OpenStreetMap": osmLayer,
            "Carto Light": cartoPositron,
            "Carto Dark": cartoDarkMatter
        };

        // Load preferred layer or set default
        const preferredLayerName = localStorage.getItem(PREFERRED_MAP_LAYER_KEY);
        let defaultLayer = osmLayer; // Default to OSM
        if (preferredLayerName && baseMaps[preferredLayerName]) {
            defaultLayer = baseMaps[preferredLayerName];
            console.log('Loading preferred map layer:', preferredLayerName);
        } else {
            console.log('No valid preferred map layer found, defaulting to OpenStreetMap.');
        }
        defaultLayer.addTo(map);



        markersLayer = L.layerGroup().addTo(map); // Initialize markersLayer
        const overlayMaps = {
            "Locations": markersLayer
        };

        L.control.layers(baseMaps, overlayMaps).addTo(map);

        // Listen for base layer changes to save preference
        map.on('baselayerchange', function(e) {
            console.log('Base layer changed to:', e.name);
            localStorage.setItem(PREFERRED_MAP_LAYER_KEY, e.name);
        });
    }
    // console.log('typeof initMap after def:', typeof initMap); // Optional: for initMap

    // --- Local Storage --- 
    const STORAGE_KEY = 'savedLocations';
    const PREFERRED_MAP_LAYER_KEY = 'preferredMapLayerName';

    function loadLocations() {
        locations = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    }
    console.log('typeof loadLocations after def:', typeof loadLocations);

    function saveLocations() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
    }

    // --- UI Rendering ---

    function createLabelIcon(labelText, locId) {
        const displayLabel = labelText && labelText.trim() !== '' ? labelText.substring(0, 15) : '📍'; // Show first 15 chars or a pin
        // Ensure unique class for potential specific styling or selection if needed, though not strictly necessary for DivIcon content
        return L.divIcon({
            html: `<div class="custom-label-marker-text">${displayLabel.replace(/[<>&'"\/]/g, c => '&#' + c.charCodeAt(0) + ';')}</div>`,
            className: 'custom-label-marker location-marker-' + locId, // Add unique class if needed
            iconSize: null, // Auto-size based on content by default, or [width, height]
            iconAnchor: [20, 10], // Adjust anchor: [half-width, half-height-ish] based on expected size
            popupAnchor: [0, -10] // Adjust popup anchor relative to iconAnchor
        });
    }

    function renderLocationsList() {
        locationsListUL.innerHTML = ''; // Clear existing list
        markersLayer.clearLayers(); // Clear existing map markers

        if (locations.length === 0) {
            noLocationsMessage.classList.remove('hidden');
            locationsListUL.classList.add('hidden');
            // If map is initialized and no locations, maybe set a default wide view
            if (map) map.setView([20, 0], 2); // Reset to a global view if no locations
            return;
        }

        noLocationsMessage.classList.add('hidden');
        locationsListUL.classList.remove('hidden');

        const bounds = [];

        locations.forEach(loc => {
            const li = document.createElement('li');
            li.setAttribute('data-id', loc.id);

            const textDiv = document.createElement('div');
            const labelSpan = document.createElement('span');
            labelSpan.className = 'location-label';
            labelSpan.textContent = loc.label || 'Unnamed Location';
            const coordsSpan = document.createElement('span');
            coordsSpan.className = 'location-coords';
            coordsSpan.textContent = ` (Lat: ${loc.lat.toFixed(5)}, Lng: ${loc.lng.toFixed(5)})`;
            
            textDiv.appendChild(labelSpan);
            textDiv.appendChild(coordsSpan);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions';

            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'edit-btn';
            editBtn.onclick = () => showLocationForm('edit', loc);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => deleteLocation(loc.id);

            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);

            li.appendChild(textDiv);
            li.appendChild(actionsDiv);
            locationsListUL.appendChild(li);

            // Add marker to map
            if (map) {
                const customIcon = createLabelIcon(loc.label, loc.id);
                const marker = L.marker([loc.lat, loc.lng], { 
                    icon: customIcon, 
                    draggable: isInEditMode // Initially not draggable unless in edit mode
                })
                .addTo(markersLayer);
                
                marker.locationId = loc.id; // Store ID for easy access

                // Original dragend logic, now also disables dragging
                marker.on('dragend', function(event) {
                    const newLatLng = event.target.getLatLng();
                    const draggedLocationId = event.target.locationId;
                    
                    const locationIndex = locations.findIndex(l => l.id === draggedLocationId);
                    if (locationIndex > -1) {
                        locations[locationIndex].lat = newLatLng.lat;
                        locations[locationIndex].lng = newLatLng.lng;
                        saveLocations();

                        // Update the list item text
                        const listItem = locationsListUL.querySelector(`li[data-id='${draggedLocationId}']`);
                        if (listItem) {
                            const coordsSpan = listItem.querySelector('.location-coords');
                            if (coordsSpan) {
                                coordsSpan.textContent = ` (Lat: ${newLatLng.lat.toFixed(5)}, Lng: ${newLatLng.lng.toFixed(5)})`;
                            }
                        }
                        // Update popup content if open (MUST be INSIDE the if locationIndex > -1 block)
                        if (marker.isPopupOpen()) {
                            marker.setPopupContent(`<b>${locations[locationIndex].label || 'Unnamed Location'}</b><br>Lat: ${newLatLng.lat.toFixed(5)}, Lng: ${newLatLng.lng.toFixed(5)}`).openPopup();
                        }
                        showNotification('Location position updated!', 'success'); // Also inside if locationIndex > -1
                } else { // This else correctly belongs to: if (locationIndex > -1)
                    console.error('Could not find dragged location in array during dragend.');
                }
            }); // End of marker.on('dragend', ...)

            marker.on('click', function(e) {
                L.DomEvent.stopPropagation(e); // Leaflet's stop propagation
                if (e.originalEvent) {
                    e.originalEvent.preventDefault();
                    e.originalEvent.stopImmediatePropagation(); // Stop other listeners on this exact element and further bubbling
                }
                console.log(`Marker clicked: ID ${loc.id}`, loc);
                // In the new UX, clicking a marker *always* shows the edit form in the drawer.
                // The isInEditMode check here is redundant if dragging is the primary way to change position in edit mode.
                // However, to maintain consistency that click = edit form:
                showLocationForm('edit', loc);
            });
            bounds.push([loc.lat, loc.lng]);
            } // Closes if (map)
        }); // Closes locations.forEach

        if (map && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    } // Closes renderLocationsList

    // --- Form Handling ---
function showLocationForm(type, data = {}) {
    console.log(`showLocationForm called with type: ${type}`, data);

    if (type === 'edit') {
        console.log('showLocationForm("edit") - bottomDrawer:', bottomDrawer);
        console.log('showLocationForm("edit") - drawerContent:', drawerContent);
        console.log('showLocationForm("edit") - editFormDrawerSection:', editFormDrawerSection);

        if (!bottomDrawer || !editFormDrawerSection) {
            console.error('Essential drawer elements not found for edit form.');
            return;
        }

        if (!bottomDrawer.classList.contains('visible')) {
            // Drawer is being opened specifically for this edit action
            bottomDrawer.dataset.openedForEdit = 'true';
        } else {
            // Drawer was already open, clear the flag just in case it was set by another path
            delete bottomDrawer.dataset.openedForEdit;
        }
        bottomDrawer.classList.add('visible'); // Ensure drawer is open
        
        if (drawerContent) {
            drawerContent.classList.add('hidden'); // Hide main list/buttons content
        } else {
            console.warn('drawerContent element not found, cannot hide it.');
        }
        
        editFormDrawerSection.classList.remove('hidden'); // Show edit form section

        // Populate the form
        editFormDrawerTitle.textContent = 'Edit Location';
        editLocationIdDrawerInput.value = data.id;
        editLocationLabelDrawerInput.value = data.label || '';
        // Ensure data.lat and data.lng exist and are numbers before calling toFixed
        editLocationLatDrawerInput.value = (typeof data.lat === 'number') ? data.lat.toFixed(6) : '';
        editLocationLngDrawerInput.value = (typeof data.lng === 'number') ? data.lng.toFixed(6) : '';

    } else { // 'new' (for the modal)
        console.log('showLocationForm("new") - locationFormSection:', locationFormSection);
        
        if (!locationFormSection) {
            console.error('locationFormSection (modal) not found.');
            return;
        }
        
        locationFormSection.classList.remove('hidden');
        
        // Populate the modal form
        if (locationFormTitle) locationFormTitle.textContent = 'Add New';
        locationIdInput.value = ''; // Clear ID for new location
        
        const existingLabels = locations.map(l => parseInt(l.label, 10)).filter(n => !isNaN(n));
        const maxLabel = existingLabels.length > 0 ? Math.max(...existingLabels) : 0;
        const nextLabelNumber = maxLabel + 1;

        locationLabelInput.value = data.label || nextLabelNumber.toString();
        locationLatInput.value = data.lat ? parseFloat(data.lat).toFixed(6) : '';
        locationLngInput.value = data.lng ? parseFloat(data.lng).toFixed(6) : '';
    }
}

    // --- Geolocation ---
    function getCurrentLocation(forForm = false) {
        if (!navigator.geolocation) {
            showNotification('Geolocation is not supported by your browser.', 'error');
            return;
        }

        try {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    if (forForm) {
                        locationLatInput.value = lat;
                        locationLngInput.value = lng;
                    }
                },
                (error) => { // Ensure 'error' is defined in this scope
                    console.error('Geolocation API error callback (getCurrentLocation for form):', error);
                    showNotification(`Unable to pre-fill location. Code: ${error.code}, Message: ${error.message}`, 'error');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } catch (e) {
            console.error('Synchronous error during getCurrentLocation for form:', e);
        }
    }

function hideLocationForm(context = 'new') { // Default to 'new'
if (context === 'edit') {
if (editFormDrawerSection) {
editFormDrawerSection.classList.add('hidden');
}
// Restore main drawer content and ensure drawer itself remains visible (or decide to close it)
if (drawerContent) {
drawerContent.classList.remove('hidden');
}
if (bottomDrawer.dataset.openedForEdit === 'true') {
            bottomDrawer.classList.remove('visible'); // Close the whole drawer
            delete bottomDrawer.dataset.openedForEdit; // Clean up
        } else {
            // Drawer was already open and should remain open showing the list.
            // Ensure bottomDrawer remains visible if it's not being closed.
            if (bottomDrawer) { // Check if bottomDrawer exists
                 bottomDrawer.classList.add('visible');
            }
        }
console.log('hideLocationForm (edit context): Hiding drawer form, showing list.');
} else { // 'new' (modal)
if (locationFormSection) {
locationFormSection.classList.add('hidden');
}
console.log('hideLocationForm (new context): Hiding modal form.');
}
}

// --- Location Management ---
function addOrUpdateLocation(context = 'new') { // Default to 'new' for safety, though explicit is better
let label, latStr, lngStr, id_val;

if (context === 'edit') {
label = editLocationLabelDrawerInput.value.trim();
latStr = editLocationLatDrawerInput.value;
lngStr = editLocationLngDrawerInput.value;
id_val = editLocationIdDrawerInput.value; // Use id_val to avoid conflict with element id 'id'
console.log('addOrUpdateLocation (edit context):', {label, latStr, lngStr, id_val});
} else { // 'new'
label = locationLabelInput.value.trim();
latStr = locationLatInput.value;
lngStr = locationLngInput.value;
id_val = locationIdInput.value; // This will be empty for a truly new location
console.log('addOrUpdateLocation (new context):', {label, latStr, lngStr, id_val});
}

const lat = parseFloat(latStr);
const lng = parseFloat(lngStr);

if (isNaN(lat) || isNaN(lng)) {
showNotification('Invalid latitude or longitude.', 'error');
return;
}

if (!label) {
showNotification('Please enter a label for the location.', 'warning');
locationLabelInput.focus();
return;
}

if (id_val && context === 'edit') { // Update existing from drawer
const index = locations.findIndex(loc => loc.id === id_val);
if (index > -1) {
locations[index] = { ...locations[index], label, lat, lng };
}
} else if (id_val && context === 'new' && locations.some(loc => loc.id === id_val)) { // Update existing from modal (less common, but possible if ID was pre-filled)
const index = locations.findIndex(loc => loc.id === id_val);
if (index > -1) {
locations[index] = { ...locations[index], label, lat, lng };
}
} else { // Add new (either from modal with no ID, or if ID from modal wasn't found for update)
const newLocation = {
id: Date.now().toString(), // Simple unique ID
label,
lat,
lng,
timestamp: new Date().toISOString()
};
locations.push(newLocation);
}
saveLocations();
renderLocationsList();
// Pass context to hideLocationForm so it knows which form to hide
hideLocationForm(context);
}

function closeMainDrawer() {
    if (bottomDrawer) {
        bottomDrawer.classList.remove('visible');
        
        // Reset content visibility for next time drawer opens
        if (editFormDrawerSection) {
            editFormDrawerSection.classList.add('hidden');
        }
        if (drawerContent) { // This is the container for list and edit form
            drawerContent.classList.remove('hidden'); // Ensure it's generally visible
        }
        if (locationsListContainer) { // Specifically ensure list is visible within drawerContent
            locationsListContainer.classList.remove('hidden');
        }
        
        delete bottomDrawer.dataset.openedForEdit; // Clear the flag
    }
}

function deleteLocation(id) {
    if (confirm('Are you sure you want to delete this location?')) {
        locations = locations.filter(loc => loc.id !== id);
        saveLocations();
        renderLocationsList();
    }
}

function clearAllLocations() {
    if (locations.length === 0) {
        showNotification("There are no locations to clear.", 'info');
        return;
    }
    if (confirm('Are you sure you want to delete ALL locations? This cannot be undone.')) {
        locations = [];
        saveLocations();
        renderLocationsList();
    }
}

function exportToXml() {
    if (locations.length === 0) {
        showNotification('No locations to export.', 'info');
        return;
    }

    let xmlString = '<?xml version="1.0" encoding="UTF-16" standalone="no"?>\n<root>\n';
    locations.forEach((loc, index) => {
        xmlString += '  <plaatsen>\n';
        xmlString += `    <id>${loc.id || index}</id>\n`;
        xmlString += `    <lat>${loc.lat}</lat>\n`;
        xmlString += `    <lng>${loc.lng}</lng>\n`;
        const escapedLabel = loc.label ? loc.label.replace(/[<>&'"]/g, c => '&#' + c.charCodeAt(0) + ';') : '';
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
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const xmlString = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "application/xml");

            const errorNode = xmlDoc.querySelector('parsererror');
            if (errorNode) {
                console.error('Error parsing XML:', errorNode.textContent);
                showNotification('Error parsing XML file. Please check the file format.', 'error');
                return;
            }

            const plaatsElements = xmlDoc.getElementsByTagName('plaatsen');
            if (plaatsElements.length === 0) {
                showNotification('No locations found in the XML file.', 'info');
                return;
            }

            let importedCount = 0;
            for (let i = 0; i < plaatsElements.length; i++) {
                const plaats = plaatsElements[i];
                const idNode = plaats.getElementsByTagName('id')[0];
                const latNode = plaats.getElementsByTagName('lat')[0];
                const lngNode = plaats.getElementsByTagName('lng')[0];
                const labelNode = plaats.getElementsByTagName('label')[0];

                if (idNode && latNode && lngNode) {
                    const id = idNode.textContent;
                    const lat = parseFloat(latNode.textContent);
                    const lng = parseFloat(lngNode.textContent);
                    let label = labelNode ? labelNode.textContent : '';

                    if (isNaN(lat) || isNaN(lng)) {
                        console.warn(`Skipping location with invalid coordinates: id ${id}`);
                        continue;
                    }

                    if (!label && id) {
                        label = id; // Use ID as label if label is empty
                    }
                    
                    // Check if location with this ID already exists to avoid duplicates, or decide on update strategy
                    // For now, we'll add as new, potentially creating duplicates if IDs match.
                    // A more robust solution might involve checking existing locations.
                    const newLocation = {
                        id: Date.now().toString() + "_" + i, // Ensure unique ID for imported items for now
                        originalId: id, // Keep original ID for reference if needed
                        label,
                        lat,
                        lng,
                        timestamp: new Date().toISOString()
                    };
                    locations.push(newLocation);
                    importedCount++;
                }
            }

            if (importedCount > 0) {
                saveLocations();
                renderLocationsList();
                showNotification(`${importedCount} location(s) imported successfully.`, 'success');
            } else {
                showNotification('No valid locations found to import.', 'info');
            }

        } catch (error) {
            console.error('Error processing XML file:', error);
            showNotification('An error occurred while processing the XML file.', 'error');
        }
        // Reset file input to allow importing the same file again if needed
        event.target.value = null;
    };
    reader.onerror = function() {
        showNotification('Error reading file.', 'error');
        event.target.value = null;
    };
    reader.readAsText(file);
}

function showEditForm(id) {
const location = locations.find(loc => loc.id === id);
if (location) {
showLocationForm('edit', location);
    }
}
function toggleEditMode() {
    isInEditMode = !isInEditMode;
    editModeBtn.textContent = isInEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode';
    editModeBtn.classList.toggle('edit-mode-active', isInEditMode);
    renderLocationsList(); 
    if (map) {
        locations.forEach(loc => {
            if (markers[loc.id]) {
                if (isInEditMode) {
                    // Long-press drag is handled by marker setup
                } else {
                    if (markers[loc.id].dragging && markers[loc.id].dragging.enabled()) {
                        markers[loc.id].dragging.disable();
                    }
                }
            }
        });
    }
    showNotification(isInEditMode ? 'Edit Mode Activated: Long-press markers to drag. Tap markers to edit details.' : 'Edit Mode Deactivated.', 'info');
}


    console.log('typeof loadLocations before call:', typeof loadLocations);
    loadLocations();
    console.log('typeof loadMap before call:', typeof loadMap);
    loadMap().then(() => {
        renderLocationsList();
    }).catch(error => {
        console.error("Error loading map on DOMContentLoaded:", error);
        showNotification("Failed to initialize the map. Please refresh the page.", 'error');
    });

    document.addEventListener('click', (event) => {
        if (bottomDrawer && bottomDrawer.classList.contains('visible') &&
            !bottomDrawer.contains(event.target) &&
            (hamburgerBtn && !hamburgerBtn.contains(event.target)) &&
            (!addLocationBtn || (addLocationBtn && !addLocationBtn.contains(event.target))) &&
            (!editModeBtn || (editModeBtn && !editModeBtn.contains(event.target)))) {
            if (editFormDrawerSection && !editFormDrawerSection.classList.contains('hidden')) {
                editFormDrawerSection.classList.add('hidden');
                if (drawerContent) drawerContent.classList.remove('hidden');
            } else {
                bottomDrawer.classList.remove('visible');
            }
            if (map) setTimeout(() => map.invalidateSize(), 300);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (editFormDrawerSection && !editFormDrawerSection.classList.contains('hidden')) {
                hideLocationForm('edit');
            } else if (bottomDrawer && bottomDrawer.classList.contains('visible')) {
                bottomDrawer.classList.remove('visible');
                if (map) setTimeout(() => map.invalidateSize(), 300);
            } else if (locationFormSection && !locationFormSection.classList.contains('hidden')) {
                 hideLocationForm('new');
            }
        }
    });

    if (editModeBtn) editModeBtn.addEventListener('click', toggleEditMode);

    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', closeMainDrawer);
    }
    
        if (addLocationBtn) {
        addLocationBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                showNotification('Geolocation is not supported by your browser', 'error');
                const nextLabel = (locations.length + 1).toString();
                showLocationForm('new', { lat: '', lng: '', label: nextLabel });
                return;
            }
            
            addLocationBtn.disabled = true;
            addLocationBtn.textContent = 'Fetching...';

            try {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const nextLabel = (locations.length + 1).toString();
                        showLocationForm('new', {
                            lat: position.coords.latitude.toFixed(6),
                            lng: position.coords.longitude.toFixed(6),
                            label: nextLabel
                        });
                        addLocationBtn.disabled = false;
                        addLocationBtn.textContent = 'Add New Location';
                    },
                    (error) => {
                        console.error('Error getting location:', error.message, 'Code:', error.code);
                        showNotification(`Error getting current location: ${error.message}. Please add manually.`, 'error');
                        const nextLabelError = (locations.length + 1).toString();
                        showLocationForm('new', { lat: '', lng: '', label: nextLabelError });
                        addLocationBtn.disabled = false;
                        addLocationBtn.textContent = 'Add New Location';
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            } catch (e) {
                console.error('Synchronous error during geolocation call:', e);
                showNotification('A critical error occurred while trying to get location: ' + e.message, 'error');
                const nextLabelCatch = (locations.length + 1).toString();
                showLocationForm('new', { lat: '', lng: '', label: nextLabelCatch });
            }
        });
    }

    if (saveLocationBtn) saveLocationBtn.addEventListener('click', () => addOrUpdateLocation('new'));
    if (cancelFormBtn) cancelFormBtn.addEventListener('click', () => hideLocationForm('new'));
    if (clearListBtn) clearListBtn.addEventListener('click', clearAllLocations);
    if (exportXmlBtn) exportXmlBtn.addEventListener('click', exportToXml);
    if (saveLocationDrawerBtn) saveLocationDrawerBtn.addEventListener('click', () => addOrUpdateLocation('edit'));
    if (cancelEditDrawerBtn) cancelEditDrawerBtn.addEventListener('click', () => hideLocationForm('edit'));
    
    if (updateLocationToCurrentBtn) {
        updateLocationToCurrentBtn.addEventListener('click', () => {
            const locationId = editLocationIdDrawerInput.value;
            if (!locationId) {
                showNotification('No location selected for update.', 'warning');
                return;
            }
            if (!navigator.geolocation) {
                showNotification('Geolocation is not supported by your browser.', 'error');
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if(editLocationLatDrawerInput) editLocationLatDrawerInput.value = position.coords.latitude.toFixed(6);
                    if(editLocationLngDrawerInput) editLocationLngDrawerInput.value = position.coords.longitude.toFixed(6);
                    showNotification('Location coordinates updated to current. Press Save to confirm.', 'info');
                },
                (error) => {
                    showNotification(`Error getting current location: ${error.message}`, 'error');
                },
                { enableHighAccuracy: true }
            );
        });
    }

    if (importXmlBtnTrigger && importXmlInput) {
        importXmlBtnTrigger.addEventListener('click', () => importXmlInput.click());
        importXmlInput.addEventListener('change', handleFileImport);
    }
    
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            if (bottomDrawer) {
                bottomDrawer.classList.toggle('visible');
                if (bottomDrawer.classList.contains('visible') && editFormDrawerSection && !editFormDrawerSection.classList.contains('hidden')) {
                    editFormDrawerSection.classList.add('hidden');
                    if (drawerContent) drawerContent.classList.remove('hidden');
                }
                 if (map) setTimeout(() => map.invalidateSize(), 300);
            }
        });
    }
});
