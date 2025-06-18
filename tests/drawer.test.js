const loadDom = require('./domHelper');

let window, document;

beforeAll(async () => {
  const dom = await loadDom();
  window = dom.window;
  document = window.document;
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
});

beforeEach(() => {
  window.localStorage.clear();
});

test('drawer closes with button and Escape key', () => {
  const hamburger = document.getElementById('hamburgerBtn');
  const closeBtn = document.getElementById('closeDrawerBtn');
  const drawer = document.getElementById('bottom-drawer');

  hamburger.click();
  expect(drawer.classList.contains('visible')).toBe(true);

  closeBtn.click();
  expect(drawer.classList.contains('visible')).toBe(false);

  hamburger.click();
  expect(drawer.classList.contains('visible')).toBe(true);

  const esc = new window.KeyboardEvent('keydown', { key: 'Escape' });
  document.dispatchEvent(esc);
  expect(drawer.classList.contains('visible')).toBe(false);
});
