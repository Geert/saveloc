const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'docs', 'index.html'), 'utf8');

test('leaflet assets are loaded locally', () => {
  expect(html).toMatch(/vendor\/leaflet\.css/);
  expect(html).toMatch(/vendor\/leaflet\.js/);
});

test('service worker caches leaflet assets', () => {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'docs', 'service-worker.js'), 'utf8');
  expect(sw).toMatch(/\.\/vendor\/leaflet\.css/);
  expect(sw).toMatch(/\.\/vendor\/leaflet\.js/);
});
