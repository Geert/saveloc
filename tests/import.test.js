const loadDom = require('./domHelper');

let window, document, saveLocTest, importInput;

beforeAll(async () => {
  const dom = await loadDom();
  window = dom.window;
  document = window.document;
  saveLocTest = window.saveLocTest;
  importInput = document.getElementById('importXmlInput');
  if (!window.setImmediate) {
    window.setImmediate = setImmediate;
  }
});

beforeEach(() => {
  window.localStorage.clear();
  saveLocTest.setLocations([]);
});

function createFile(content) {
  return new window.File([content], 'import.xml', { type: 'application/xml' });
}

test('handleFileImport imports XML file', async () => {
  const xml = `<?xml version="1.0"?><root><plaatsen><id>1</id><lat>10</lat><lng>20</lng><label>Home</label></plaatsen></root>`;
  Object.defineProperty(importInput, 'files', { value: [createFile(xml)], configurable: true });
  importInput.dispatchEvent(new window.Event('change'));
  await new Promise(res => setTimeout(res, 50));
  expect(saveLocTest.getLocations().length).toBe(1);
  const loc = saveLocTest.getLocations()[0];
  expect(loc.lat).toBe(10);
  expect(loc.lng).toBe(20);
  expect(loc.label).toBe('Home');
});

test('handleFileImport ignores invalid XML', async () => {
  const xml = `<root><plaatsen><id>1</id><lat>10</lat></root>`; // missing elements
  Object.defineProperty(importInput, 'files', { value: [createFile(xml)], configurable: true });
  importInput.dispatchEvent(new window.Event('change'));
  await new Promise(res => setTimeout(res, 50));
  expect(saveLocTest.getLocations().length).toBe(0);
  const stored = window.localStorage.getItem('savedLocations');
  expect(stored).toBeNull();
});
