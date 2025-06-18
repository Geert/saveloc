const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('UI elements', () => {
  let document;
  beforeAll(() => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'docs', 'index.html'), 'utf8');
    const dom = new JSDOM(html);
    document = dom.window.document;
  });

  test('has Add Location button', () => {
    expect(document.getElementById('addLocationBtn')).not.toBeNull();
  });

  test('drawer contains import elements', () => {
    expect(document.getElementById('bottom-drawer')).not.toBeNull();
    expect(document.getElementById('importXmlBtnTrigger')).not.toBeNull();
    const input = document.getElementById('importXmlInput');
    expect(input).not.toBeNull();
    expect(input.getAttribute('type')).toBe('file');
  });

  test('links to manifest and script', () => {
    const manifest = document.querySelector('link[rel="manifest"]');
    expect(manifest).not.toBeNull();
    const script = document.querySelector('script[src="main.mjs"]');
    expect(script).not.toBeNull();
  });
});
