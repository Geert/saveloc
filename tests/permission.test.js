const loadDom = require('./domHelper');

let window, saveLocTest;

beforeAll(async () => {
  const dom = await loadDom();
  window = dom.window;
  saveLocTest = window.saveLocTest;
});

beforeEach(() => {
  window.localStorage.clear();
});

test('requestLocationPermission returns false when denied', async () => {
  window.navigator.permissions = {
    query: jest.fn().mockResolvedValue({ state: 'denied' })
  };
  const result = await saveLocTest.requestLocationPermission();
  expect(result).toBe(false);
});

test('requestLocationPermission resolves when granted', async () => {
  window.navigator.permissions = {
    query: jest.fn().mockResolvedValue({ state: 'granted' })
  };
  const result = await saveLocTest.requestLocationPermission();
  expect(result).toBe(true);
});
