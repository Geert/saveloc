const loadDom = require('./domHelper');

let window, saveLocTest, document;

beforeAll(async () => {
  const dom = await loadDom();
  window = dom.window;
  document = window.document;
  saveLocTest = window.saveLocTest;
});

beforeEach(() => {
  window.localStorage.clear();
  saveLocTest.setLocations([]);
});

test('showNotification appends element with correct classes', () => {
  const container = document.getElementById('notification-container');
  window.setTimeout = jest.fn();
  global.setTimeout = window.setTimeout;
  saveLocTest.showNotification('hello', 'success', 1000);
  const note = container.querySelector('.notification');
  expect(note).not.toBeNull();
  expect(note.textContent).toBe('hello');
  expect(note.classList.contains('success')).toBe(true);
  expect(window.setTimeout).toHaveBeenCalledTimes(2);
});

test('exportToXml creates and downloads xml', async () => {
  saveLocTest.setLocations([{ id: '1', lat: 1, lng: 2, label: 'A', rotation: 10 }]);
  let capturedBlob;
  window.URL.createObjectURL = jest.fn(blob => {
    capturedBlob = blob;
    return 'blob:url';
  });
  window.URL.revokeObjectURL = jest.fn();
  const appendSpy = jest.spyOn(document.body, 'appendChild');
  const removeSpy = jest.spyOn(document.body, 'removeChild');
  saveLocTest.exportToXml();
  expect(window.URL.createObjectURL).toHaveBeenCalled();
  expect(appendSpy).toHaveBeenCalled();
  expect(removeSpy).toHaveBeenCalled();
  expect(capturedBlob instanceof window.Blob).toBe(true);
  expect(capturedBlob.type).toBe('application/xml;charset=utf-16');
  appendSpy.mockRestore();
  removeSpy.mockRestore();
});

test('handleFileImport imports xml without rotation', async () => {
  const xml = '<?xml version="1.0"?><root><plaatsen><id>1</id><lat>1</lat><lng>2</lng><label>A</label></plaatsen></root>';
  const file = new window.File([xml], 'test.xml');
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ elements: [] }) });
  await saveLocTest.handleFileImport({ target: { files: [file], value: null } });
  expect(saveLocTest.getLocations().length).toBe(1);
  expect(saveLocTest.getLocations()[0].rotation).toBe(0);
  global.fetch = originalFetch;
});

test('addOrUpdateLocation adds new location from modal inputs', () => {
  document.getElementById('locationLabel').value = 'Home';
  document.getElementById('locationLat').value = '1';
  document.getElementById('locationLng').value = '2';
  document.getElementById('locationRotation').value = '0';
  document.getElementById('locationId').value = '';
  saveLocTest.addOrUpdateLocation('new');
  expect(saveLocTest.getLocations().length).toBe(1);
  const formHidden = document.getElementById('location-form-section').classList.contains('hidden');
  expect(formHidden).toBe(true);
});

test('rotate buttons adjust add form rotation', () => {
  const rot = document.getElementById('locationRotation');
  rot.value = '0';
  document.getElementById('rotateRightAddBtn').click();
  expect(rot.value).toBe('15');
  document.getElementById('rotateLeftAddBtn').click();
  expect(rot.value).toBe('0');
});

test('rotate buttons adjust edit drawer rotation', () => {
  const loc = { id: '1', lat: 1, lng: 2, label: 'A', rotation: 0 };
  saveLocTest.setLocations([loc]);
  saveLocTest.renderLocationsList();
  saveLocTest.showEditForm(loc);
  const rotField = document.getElementById('editLocationRotDrawer');
  document.getElementById('rotateRightDrawerBtn').click();
  expect(rotField.value).toBe('15');
  document.getElementById('rotateLeftDrawerBtn').click();
  expect(rotField.value).toBe('0');
});

test('clearAllLocations empties stored locations when confirmed', () => {
  saveLocTest.setLocations([{ id: '1', lat: 1, lng: 2, label: 'A' }]);
  window.confirm = jest.fn(() => true);
  global.confirm = window.confirm;
  saveLocTest.clearAllLocations();
  expect(saveLocTest.getLocations()).toEqual([]);
});

test('createLabelIcon sanitizes label text', () => {
  window.L.divIcon = jest.fn(opts => opts);
  const icon = saveLocTest.createLabelIcon('Hi <b>', '1');
  expect(icon.html).toContain('Hi');
  expect(icon.html).not.toContain('<b>');
});
