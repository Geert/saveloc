const loadDom = require('./domHelper');

let window, saveLocTest;

beforeAll(async () => {
  const dom = await loadDom();
  window = dom.window;
  saveLocTest = window.saveLocTest;
});

beforeEach(() => {
  window.localStorage.clear();
  saveLocTest.setLocations([]);
  window.L.__markers.length = 0;
});

test('renderLocationsList creates markers for each location', () => {
  const locs = [
    { id: '1', lat: 10, lng: 20, label: 'A' },
    { id: '2', lat: 30, lng: 40, label: 'B' }
  ];
  saveLocTest.setLocations(locs);
  saveLocTest.renderLocationsList();
  expect(Object.keys(window.appState.markers).length).toBe(2);
  expect(window.L.__markers.length).toBe(2);
});

test('marker drag updates location coordinates in edit mode', () => {
  window.appState.isInEditMode = true;
  const loc = { id: '1', lat: 5, lng: 6, label: 'Drag' };
  saveLocTest.setLocations([loc]);
  saveLocTest.renderLocationsList();
  const marker = window.appState.markers['1'];
  expect(marker.dragging.enabled()).toBe(true);
  marker.setLatLng({ lat: 7, lng: 8 });
  marker.trigger('dragend');
  const updated = saveLocTest.getLocations()[0];
  expect(updated.lat).toBe(7);
  expect(updated.lng).toBe(8);
});
