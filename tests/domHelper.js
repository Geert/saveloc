const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

module.exports = async function loadDom() {
  let html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  html = html
    .replace(/<link[^>]*unpkg[^>]*>/g, '')
    .replace(/<script[^>]*unpkg[^>]*><\/script>/g, '')
    .replace(/<script[^>]*src="main.js"[^>]*><\/script>/, '')
    .replace(/<script[^>]*src="src\/[^"]*"[^>]*><\/script>/g, '')
    .replace(/<link[^>]*href="style.css"[^>]*>/, '');
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost' });

  // Remove external styles/scripts to avoid network access
  dom.window.document.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
    if (el.href.startsWith('http')) el.remove();
  });
  dom.window.document.querySelectorAll('script[src]').forEach(el => {
    if (el.src.startsWith('http')) el.remove();
  });

  dom.window.console.log = () => {};
  dom.window.console.error = () => {};

  dom.window.navigator.geolocation = {
    getCurrentPosition: (success, error) => {
      if (success) success({ coords: { latitude: 0, longitude: 0 } });
    }
  };

  dom.window.setTimeout = fn => { fn(); return 0; };
  dom.window.setInterval = () => 0;
  // jsdom does not provide setImmediate by default
  dom.window.setImmediate = fn => setImmediate(fn);

  // Minimal Leaflet stub so main.js can run
  dom.window.L = {
    map: () => ({ setView: () => {}, on: () => {}, addLayer: () => {},
      remove: () => {}, fitBounds: () => {} }),
    tileLayer: () => ({ addTo: () => {} }),
    divIcon: () => ({}),
    layerGroup: () => ({ addTo: () => ({ clearLayers: () => {} }) }),
    control: { layers: () => ({ addTo: () => {} }) },
    marker: () => ({
      addTo: () => ({ on: () => {}, setPopupContent: () => {}, openPopup: () => {}, isPopupOpen: () => false, locationId: '', dragging: { enabled: () => false, disable: () => {} } }),
      on: () => {},
      setPopupContent: () => {},
      openPopup: () => {},
      isPopupOpen: () => false,
      locationId: '',
      dragging: { enabled: () => false, disable: () => {} }
    })
  };

  const modules = ['src/state.js', 'src/ui.js', 'src/storage.js', 'src/permission.js', 'src/map.js', 'main.js'];
  modules.forEach(file => {
    const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    dom.window.eval(content);
  });
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  await Promise.resolve();
  return dom;
};
