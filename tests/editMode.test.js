const loadDom = require('./domHelper');

let window, document, saveLocTest;

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

test('toggleEditMode updates button text', () => {
  const btn = document.getElementById('editModeBtn');

  expect(btn.textContent).toContain('Edit');

  btn.click();
  expect(btn.textContent).toContain('Exit');

  btn.click();
  expect(btn.textContent).toContain('Enter');
});
