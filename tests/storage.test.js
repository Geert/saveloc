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
});

test('saveLocations stores data to localStorage', () => {
  const data = [{ id: '1', lat: 1, lng: 2, label: 'A' }];
  saveLocTest.setLocations(data);
  saveLocTest.saveLocations();
  const stored = JSON.parse(window.localStorage.getItem('savedLocations'));
  expect(stored).toEqual(data);
});

test('loadLocations reads data from localStorage', () => {
  const data = [{ id: '2', lat: 3, lng: 4, label: 'B' }];
  window.localStorage.setItem('savedLocations', JSON.stringify(data));
  saveLocTest.loadLocations();
  expect(saveLocTest.getLocations()).toEqual(data);
});
