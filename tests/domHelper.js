const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

module.exports = async function loadDom() {
  let html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  html = html
    .replace(/<link[^>]*unpkg[^>]*>/g, '')
    .replace(/<script[^>]*unpkg[^>]*><\/script>/g, '')
    .replace(/<script[^>]*src="main.mjs"[^>]*><\/script>/, '')
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

  class TestFile extends dom.window.Blob {
    constructor(parts, name, options = {}) {
      super(parts, options);
      this.name = name || '';
      this.lastModified = options.lastModified || Date.now();
      this._text = parts.map(p => p.toString()).join('');
    }
  }
  dom.window.File = TestFile;

  dom.window.navigator.geolocation = {
    getCurrentPosition: (success, error) => {
      if (success) success({ coords: { latitude: 0, longitude: 0 } });
    }
  };

  dom.window.setTimeout = fn => { fn(); return 0; };
  dom.window.setInterval = () => 0;
  // jsdom does not provide setImmediate by default
  const timers = require('timers');
  dom.window.setImmediate = fn => timers.setImmediate(fn);

  // Minimal Leaflet stub so main.mjs can run
  const markers = [];
  dom.window.L = {
    map: () => {
      const map = {
        setView: () => map,
        on: () => map,
        addLayer: () => map,
        remove: () => {},
        fitBounds: () => {},
        invalidateSize: () => {}
      };
      return map;
    },
    tileLayer: () => ({ addTo: () => {} }),
    divIcon: () => ({}),
    layerGroup: () => ({ addTo: () => ({ clearLayers: () => {} }), clearLayers: () => {} }),
    control: { layers: () => ({ addTo: () => {} }) },
    marker: (latLng = [0,0], opts = {}) => {
      const events = {};
      let coords = { lat: latLng[0], lng: latLng[1] };
      const marker = {
        options: opts,
        addTo: () => marker,
        on: (evt, handler) => { events[evt] = handler; return marker; },
        getLatLng: () => coords,
        setLatLng: ll => { coords = { lat: ll.lat, lng: ll.lng }; },
        setPopupContent: () => marker,
        openPopup: () => marker,
        isPopupOpen: () => false,
        locationId: '',
        dragging: {
          enabled: () => !!opts.draggable,
          enable: () => { opts.draggable = true; },
          disable: () => { opts.draggable = false; }
        },
        trigger: evt => { if (events[evt]) events[evt]({ target: marker }); }
      };
      markers.push(marker);
      return marker;
    }
  };
  dom.window.L.__markers = markers;

  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.localStorage = dom.window.localStorage;
  global.L = dom.window.L;
  global.setTimeout = dom.window.setTimeout;
  global.setInterval = dom.window.setInterval;
  global.setImmediate = dom.window.setImmediate;
  global.URL = dom.window.URL;
  global.Blob = dom.window.Blob;
  global.alert = dom.window.alert;
  global.confirm = dom.window.confirm;
  global.XMLSerializer = dom.window.XMLSerializer;
  global.DOMParser = dom.window.DOMParser;
  class SimpleFileReader {
    constructor() { this.onload = null; this.onerror = null; }
    readAsText(file) {
      try {
        const text = file._text || '';
        if (this.onload) this.onload({ target: { result: text } });
      } catch (err) {
        if (this.onerror) this.onerror(err);
      }
    }
  }
  global.FileReader = SimpleFileReader;
  dom.window.FileReader = SimpleFileReader;

  const vm = require('vm');
  const { pathToFileURL } = require('url');

  const loaded = new Map();
  async function loadModule(file) {
    if (loaded.has(file)) return loaded.get(file);
    const code = fs.readFileSync(file, 'utf8');
    const mod = new vm.SourceTextModule(code, {
      context: dom.getInternalVMContext(),
      identifier: pathToFileURL(file).href
    });
    loaded.set(file, mod);
    await mod.link(spec => {
      const resolved = path.join(path.dirname(file), spec);
      return loadModule(resolved);
    });
    await mod.evaluate();
    return mod;
  }

  const controllerMod = await loadModule(path.join(__dirname, '..', 'src', 'ui-controller.mjs'));
  const stateMod = await loadModule(path.join(__dirname, '..', 'src', 'state.mjs'));
  const controllerNs = controllerMod.namespace;
  const stateNs = stateMod.namespace;
  dom.window.appState = stateNs.default;
  dom.window.saveLocTest = controllerNs.default.testApi;
  controllerNs.default.init();
  return dom;
};
