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

function createFile(content) {
  return new window.File([content], 'import.xml', { type: 'application/xml' });
}

test('export action closes the drawer', () => {
  saveLocTest.setLocations([{ id: '1', lat: 1, lng: 2, label: 'A' }]);
  saveLocTest.toggleDrawer();
  const drawer = document.getElementById('bottom-drawer');
  expect(drawer.classList.contains('visible')).toBe(true);
  window.URL.createObjectURL = jest.fn(() => 'blob:url');
  window.URL.revokeObjectURL = jest.fn();
  saveLocTest.exportToXml();
  expect(drawer.classList.contains('visible')).toBe(false);
});

test('import action closes the drawer', async () => {
  saveLocTest.toggleDrawer();
  const drawer = document.getElementById('bottom-drawer');
  expect(drawer.classList.contains('visible')).toBe(true);
  const xml = `<?xml version="1.0"?><root><plaatsen><id>1</id><lat>10</lat><lng>20</lng><label>Home</label></plaatsen></root>`;
  const event = { target: { files: [createFile(xml)] } };
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ elements: [] }) });
  await saveLocTest.handleFileImport(event);
  global.fetch = originalFetch;
  expect(drawer.classList.contains('visible')).toBe(false);
});

test('clear list action closes the drawer', () => {
  saveLocTest.setLocations([{ id: '1', lat: 1, lng: 2, label: 'A' }]);
  saveLocTest.toggleDrawer();
  const drawer = document.getElementById('bottom-drawer');
  expect(drawer.classList.contains('visible')).toBe(true);
  window.confirm = jest.fn(() => true);
  global.confirm = window.confirm;
  saveLocTest.clearAllLocations();
  expect(drawer.classList.contains('visible')).toBe(false);
});
