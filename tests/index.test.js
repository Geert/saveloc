const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('index.html', () => {
  let dom;
  beforeAll(() => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    dom = new JSDOM(html);
  });

  test('contains map container', () => {
    const map = dom.window.document.getElementById('map');
    expect(map).not.toBeNull();
  });
});
