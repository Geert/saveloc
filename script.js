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

    // --- Map Initialization ---
    let map = null;
    let markersLayer = null; // Layer group for markers

    function initMap() {
        map = L.map('map').setView([51.505, -0.09], 2); // Default view
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);
    }

    // --- Local Storage --- 
    const STORAGE_KEY = 'savedLocations';
    let locations = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    function saveLocations() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
    }

    // --- UI Rendering ---
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
                const marker = L.marker([loc.lat, loc.lng]).addTo(markersLayer);
                marker.bindPopup(`<b>${loc.label || 'Unnamed Location'}</b><br>Lat: ${loc.lat.toFixed(5)}<br>Lng: ${loc.lng.toFixed(5)}`);
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
                    locationLabelInput.focus(); // Focus on label input
                },
                (error) => { // Ensure 'error' is defined in this scope
                    console.error('Geolocation API error callback:', error);
                    alert(`Unable to retrieve location. Code: ${error.code}, Message: ${error.message}`);
                    // Still show the form but without coordinates
                    showLocationForm('add'); 
                    locationLatInput.value = '';
                    locationLngInput.value = '';
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
