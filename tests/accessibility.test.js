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
});

test('focus moves to label when add form opens and returns on close', () => {
  const trigger = document.getElementById('addLocationBtn');
  trigger.focus();
  saveLocTest.showAddForm();
  expect(document.activeElement).toBe(document.getElementById('locationLabel'));
  saveLocTest.hideAddForm();
  expect(document.activeElement).toBe(trigger);
});

test('editing coordinate inputs updates marker position', () => {
  const loc = { id: '1', lat: 1, lng: 2, label: 'A' };
  saveLocTest.setLocations([loc]);
  saveLocTest.renderLocationsList();
  const marker = window.appState.markers['1'];
  saveLocTest.showEditForm(loc);
  const latInput = document.getElementById('editLocationLatDrawer');
  const lngInput = document.getElementById('editLocationLngDrawer');
  latInput.value = '3';
  lngInput.value = '4';
  latInput.dispatchEvent(new window.Event('input'));
  lngInput.dispatchEvent(new window.Event('input'));
  const pos = marker.getLatLng();
  expect(pos.lat).toBe(3);
  expect(pos.lng).toBe(4);
  saveLocTest.hideEditForm();
});
