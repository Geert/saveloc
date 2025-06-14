// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired. Script starting...');
    // --- DOM Elements ---
    const addLocationBtn = document.getElementById('addLocationBtn');
    const clearListBtn = document.getElementById('clearListBtn');
    const exportXmlBtn = document.getElementById('exportXmlBtn');
    const saveLocationBtn = document.getElementById('saveLocationBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');

    const locationFormSection = document.getElementById('location-form-section');
    const formTitle = document.getElementById('form-title');
    const locationIdInput = document.getElementById('locationId');
    const locationLabelInput = document.getElementById('locationLabel');
    const locationLatInput = document.getElementById('locationLat');
    const locationLngInput = document.getElementById('locationLng');

    const locationsListUL = document.getElementById('locationsList');
    const noLocationsMessage = document.getElementById('no-locations-message');

    // New UI elements for drawer/menu
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bottomDrawer = document.getElementById('bottom-drawer');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const importXmlBtnTrigger = document.getElementById('importXmlBtnTrigger');
    const importXmlInput = document.getElementById('importXmlInput');

    // --- Map Initialization ---
    let map = null;
    let markersLayer = null; // Layer group for markers

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

        // Set default layer
        osmLayer.addTo(map);

        const baseMaps = {
            "OpenStreetMap": osmLayer,
            "Carto Light": cartoPositron,
            "Carto Dark": cartoDarkMatter
        };

        markersLayer = L.layerGroup().addTo(map); // Initialize markersLayer
        const overlayMaps = {
            "Locations": markersLayer
        };

        L.control.layers(baseMaps, overlayMaps).addTo(map);
    }

    // --- Local Storage --- 
    const STORAGE_KEY = 'savedLocations';
    let locations = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

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
            editBtn.onclick = () => showEditForm(loc.id);

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
                    draggable: true 
                })
                .addTo(markersLayer)
                .bindPopup(`<b>${loc.label || 'Unnamed Location'}</b><br>Lat: ${loc.lat.toFixed(5)}, Lng: ${loc.lng.toFixed(5)}`);
                
                marker.locationId = loc.id; // Store ID for easy access

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
                        // Update popup content if open
                        if (marker.isPopupOpen()) {
                            marker.setPopupContent(`<b>${locations[locationIndex].label || 'Unnamed Location'}</b><br>Lat: ${newLatLng.lat.toFixed(5)}, Lng: ${newLatLng.lng.toFixed(5)}`).openPopup();
                        }
                        console.log(`Location ${draggedLocationId} updated to Lat: ${newLatLng.lat}, Lng: ${newLatLng.lng}`);
                    } else {
                        console.error('Could not find dragged location in array');
                    }
                });

                bounds.push([loc.lat, loc.lng]);
            }
        });

        if (map && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    // --- Form Handling ---
    function showLocationForm(type = 'add', location = null) {
        locationFormSection.classList.remove('hidden');
        if (type === 'add') {
            formTitle.textContent = 'Add New';
            locationIdInput.value = '';
            locationLabelInput.value = '';
            // Geolocation will fill lat/lng
            getCurrentLocation(true); // true to indicate it's for the form
        } else if (type === 'edit' && location) {
            formTitle.textContent = 'Edit';
            locationIdInput.value = location.id;
            locationLabelInput.value = location.label;
            locationLatInput.value = location.lat;
            locationLngInput.value = location.lng;
            // Ask if user wants to update to current location for this edit
            if (confirm("Update coordinates to current location?")) {
                getCurrentLocation(true);
            }
        }
    }

    function hideLocationForm() {
        locationFormSection.classList.add('hidden');
        locationLabelInput.value = '';
        locationLatInput.value = '';
        locationLngInput.value = '';
        locationIdInput.value = '';
    }

    // --- Geolocation ---
    function getCurrentLocation(forForm = false) {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
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
                    alert(`Unable to pre-fill location. Code: ${error.code}, Message: ${error.message}`);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } catch (e) {
            console.error('Synchronous error during getCurrentLocation for form:', e);
            alert('A critical error occurred while trying to pre-fill location: ' + e.message);
        }
    }

    // --- Location Management ---
    function addOrUpdateLocation() {
        const label = locationLabelInput.value.trim();
        const lat = parseFloat(locationLatInput.value);
        const lng = parseFloat(locationLngInput.value);
        const id = locationIdInput.value;

        if (isNaN(lat) || isNaN(lng)) {
            alert('Invalid latitude or longitude.');
            return;
        }

        if (!label) {
            alert('Please enter a label for the location.');
            locationLabelInput.focus();
            return;
        }

        if (id) { // Update existing
            const index = locations.findIndex(loc => loc.id === id);
            if (index > -1) {
                locations[index] = { ...locations[index], label, lat, lng };
            }
        } else { // Add new
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
        hideLocationForm();
    }

    function showEditForm(id) {
        const location = locations.find(loc => loc.id === id);
        if (location) {
            showLocationForm('edit', location);
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
            alert("There are no locations to clear.");
            return;
        }
        if (confirm('Are you sure you want to delete ALL locations? This cannot be undone.')) {
            locations = [];
            saveLocations();
            renderLocationsList();
        }
    }

    // --- XML Export ---
    function exportToXml() {
        if (locations.length === 0) {
            alert('No locations to export.');
            return;
        }

        let xmlString = '<?xml version="1.0" encoding="UTF-16" standalone="no"?>\n<root>\n';
        locations.forEach((loc, index) => {
            xmlString += '  <plaatsen>\n';
            xmlString += `    <id>${index}</id>\n`; // Using index as ID for export as per example
            xmlString += `    <lat>${loc.lat}</lat>\n`;
            xmlString += `    <lng>${loc.lng}</lng>\n`;
            xmlString += `    <label>${loc.label ? loc.label.replace(/[<>&'"]/g, c => '&#' + c.charCodeAt(0) + ';') : ''}</label>\n`; // Basic XML escaping for label
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

    // --- Event Listeners ---
    addLocationBtn.addEventListener('click', () => {
        console.log('Add Current Location button clicked.');
        // Get current location, then show form with pre-filled coords
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }
        try {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('Position retrieved:', position);
                    showLocationForm('add'); // Show form
                    locationLatInput.value = position.coords.latitude; // Pre-fill
                    locationLngInput.value = position.coords.longitude; // Pre-fill
                    const nextLabelNumberSuccess = locations.length + 1;
                    locationLabelInput.value = nextLabelNumberSuccess.toString(); // Pre-fill numeric label
                    locationLabelInput.focus(); // Focus on label input
                },
                (error) => { // Ensure 'error' is defined in this scope
                    console.error('Geolocation API error callback:', error);
                    alert(`Unable to retrieve location. Code: ${error.code}, Message: ${error.message}`);
                    // Still show the form but without coordinates
                    showLocationForm('add'); 
                    locationLatInput.value = '';
                    locationLngInput.value = '';
                    const nextLabelNumberError = locations.length + 1;
                    locationLabelInput.value = nextLabelNumberError.toString(); // Pre-fill numeric label
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } catch (e) {
            console.error('Synchronous error during geolocation call:', e);
            alert('A critical error occurred while trying to get location: ' + e.message);
        }
    });

    clearListBtn.addEventListener('click', clearAllLocations);
    exportXmlBtn.addEventListener('click', exportToXml);
    saveLocationBtn.addEventListener('click', addOrUpdateLocation);
    cancelFormBtn.addEventListener('click', hideLocationForm);

    // --- XML Import ---
    if (importXmlBtnTrigger && importXmlInput) {
        importXmlBtnTrigger.addEventListener('click', () => {
            importXmlInput.click(); // Trigger hidden file input
        });

        importXmlInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                console.log('File selected for import:', file.name);
                const reader = new FileReader();

                reader.onload = (e) => {
                    try {
                        const xmlString = e.target.result;
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

                        const parserErrors = xmlDoc.getElementsByTagName("parsererror");
                        if (parserErrors.length > 0) {
                            console.error('XML Parsing Error:', parserErrors[0].textContent);
                            alert('Error parsing XML file. Please ensure it is a valid XML.');
                            event.target.value = null; // Reset file input
                            return;
                        }

                        const xmlPlaatsen = xmlDoc.getElementsByTagName("plaatsen");
                        let importedCount = 0;
                        const newLocations = [];

                        for (let i = 0; i < xmlPlaatsen.length; i++) {
                            const plaats = xmlPlaatsen[i];
                            const xmlIdNode = plaats.getElementsByTagName("id")[0];
                            const latNode = plaats.getElementsByTagName("lat")[0];
                            const lngNode = plaats.getElementsByTagName("lng")[0];
                            const labelNode = plaats.getElementsByTagName("label")[0];

                            const xmlId = xmlIdNode ? xmlIdNode.textContent.trim() : '';
                            const lat = latNode ? parseFloat(latNode.textContent) : null;
                            const lng = lngNode ? parseFloat(lngNode.textContent) : null;
                            let label = labelNode ? labelNode.textContent.trim() : '';

                            if (lat === null || isNaN(lat) || lng === null || isNaN(lng)) {
                                console.warn('Skipping invalid location entry from XML (missing/invalid lat/lng):', plaats.innerHTML);
                                continue;
                            }

                            if (label === '') {
                                label = xmlId || `Imported ${Date.now().toString().slice(-4)}`; // Use XML ID or a generic fallback
                            }

                            const newAppId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);

                            newLocations.push({
                                id: newAppId,
                                lat: lat,
                                lng: lng,
                                label: label
                            });
                            importedCount++;
                        }

                        if (newLocations.length > 0) {
                            locations.push(...newLocations);
                            saveLocations();
                            renderLocationsList();
                            alert(`${importedCount} location(s) imported successfully!`);
                        } else {
                            alert('No valid locations found in the XML file to import.');
                        }

                    } catch (error) {
                        console.error('Error processing XML file:', error);
                        alert('An error occurred while importing the file.');
                    }
                    // Reset file input to allow importing the same file again if needed
                    event.target.value = null; 
                };

                reader.onerror = () => {
                    console.error('Error reading file:', reader.error);
                    alert('Error reading the selected file.');
                    event.target.value = null; // Reset file input
                };

                reader.readAsText(file);
            }
        });
    } else {
        console.error('Import XML buttons not found.');
    }

    // Hamburger menu and drawer functionality
    if (hamburgerBtn && bottomDrawer && closeDrawerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            console.log('Hamburger button clicked');
            console.log('Drawer classList BEFORE toggle:', bottomDrawer.classList);
            bottomDrawer.classList.toggle('visible');
            console.log('Drawer classList AFTER toggle:', bottomDrawer.classList);
            // Invalidate map size after drawer animation
            setTimeout(() => {
                if (map) map.invalidateSize();
            }, 300); // Corresponds to CSS transition time
        });

        closeDrawerBtn.addEventListener('click', () => {
            console.log('Close drawer button clicked');
            console.log('Drawer classList BEFORE remove (close):', bottomDrawer.classList);
            bottomDrawer.classList.remove('visible');
            console.log('Drawer classList AFTER remove (close):', bottomDrawer.classList);
            // Invalidate map size after drawer animation
            setTimeout(() => {
                if (map) map.invalidateSize();
            }, 300); // Corresponds to CSS transition time
        });
    } else {
        console.error('Hamburger menu buttons or drawer not found. UI may not function as expected.');
    }

    // --- Initial Load ---
    initMap();
    renderLocationsList();

    // --- PWA Basic Manifest and Service Worker Placeholder ---
    // Create manifest.json
    const manifest = {
        "name": "MarketLocations - Location Saver",
        "short_name": "MarketLocations",
        "description": "A simple app to save and manage GPS locations.",
        "start_url": "/index.html",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#007bff",
        "icons": [
            {
                "src": "icons/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "icons/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png"
            }
        ]
    };
    // Note: manifest.json should be a separate file. This is just for reference.
    // The HTML already links to manifest.json

    // Placeholder for service worker registration (optional, for PWA features like offline)
    /*
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(error => {
            console.error('Service Worker registration failed:', error);
        });
    }
    */
});
