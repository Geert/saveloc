const loadDom = require('./domHelper');

let window, document, saveLocTest;

beforeAll(async () => {
  const dom = await loadDom();
  window = dom.window;
  document = window.document;
  saveLocTest = window.saveLocTest;
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
});

beforeEach(() => {
  window.localStorage.clear();
  saveLocTest.setLocations([]);
  window.L.__markers.length = 0;
});

test('showSavedLocations displays section and restores focus on hide', () => {
  const trigger = document.getElementById('viewSavedLocationsBtn');
  trigger.focus();
  const section = document.getElementById('saved-locations-section');
  saveLocTest.showSavedLocations();
  expect(section.classList.contains('hidden')).toBe(false);
  expect(document.activeElement).toBe(document.getElementById('closeSavedLocationsBtn'));
  saveLocTest.hideSavedLocations();
  expect(section.classList.contains('hidden')).toBe(true);
  expect(document.activeElement).toBe(trigger);
});

test('updateMarkerPosition updates marker coords', () => {
  const loc = { id: '1', lat: 1, lng: 2, label: 'A' };
  saveLocTest.setLocations([loc]);
  saveLocTest.renderLocationsList();
  const marker = window.appState.markers['1'];
  saveLocTest.updateMarkerPosition('1', 3, 4);
  const pos = marker.getLatLng();
  expect(pos.lat).toBe(3);
  expect(pos.lng).toBe(4);
});

test('setBaseLayer changes layer and stores preference', () => {
  window.localStorage.setItem('preferredMapLayerName', 'OpenStreetMap');
  saveLocTest.setBaseLayer('Carto Dark');
  expect(saveLocTest.getCurrentBaseLayerName()).toBe('Carto Dark');
  expect(window.localStorage.getItem('preferredMapLayerName')).toBe('Carto Dark');
});

test('getBaseLayerNames returns available layers', () => {
  const names = saveLocTest.getBaseLayerNames();
  expect(names).toContain('OpenStreetMap');
  expect(names).toContain('Carto Dark');
});

test('forceRefresh does not show notification when online', () => {
  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  const notifySpy = jest.spyOn(saveLocTest, 'showNotification');
  saveLocTest.forceRefresh();
  expect(notifySpy).not.toHaveBeenCalled();
  notifySpy.mockRestore();
});

