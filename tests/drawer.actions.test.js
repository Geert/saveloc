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

test('saving edits closes the drawer', () => {
  const loc = { id: '1', lat: 1, lng: 2, label: 'A' };
  saveLocTest.setLocations([loc]);
  saveLocTest.renderLocationsList();
  saveLocTest.showEditForm(loc);
  const drawer = document.getElementById('bottom-drawer');
  expect(drawer.classList.contains('visible')).toBe(true);
  document.getElementById('editLocationLabelDrawer').value = 'B';
  document.getElementById('saveLocationDrawerBtn').click();
  expect(drawer.classList.contains('visible')).toBe(false);
});

test('canceling edit closes the drawer', () => {
  const loc = { id: '1', lat: 1, lng: 2, label: 'A' };
  saveLocTest.setLocations([loc]);
  saveLocTest.renderLocationsList();
  saveLocTest.showEditForm(loc);
  const drawer = document.getElementById('bottom-drawer');
  expect(drawer.classList.contains('visible')).toBe(true);
  document.getElementById('cancelEditDrawerBtn').click();
  expect(drawer.classList.contains('visible')).toBe(false);
});
