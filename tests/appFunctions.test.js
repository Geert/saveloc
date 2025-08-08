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
  saveLocTest.setLocations([{ id: '1', lat: 1, lng: 2, label: 'A' }]);
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
