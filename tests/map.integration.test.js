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

test('loading stored locations renders markers on map', () => {
  const stored = [
    { id: 'a', lat: 11, lng: 22, label: 'Stored' }
  ];
  window.localStorage.setItem('savedLocations', JSON.stringify(stored));
  saveLocTest.loadLocations();
  saveLocTest.renderLocationsList();
  expect(window.L.__markers.length).toBe(1);
  const keys = Object.keys(window.appState.markers);
  expect(keys).toEqual(['a']);
});
