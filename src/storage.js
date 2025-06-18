(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./state'));
  } else {
    root.storage = factory(root.appState);
  }
}(typeof self !== 'undefined' ? self : this, function (state) {
  const STORAGE_KEY = 'savedLocations';

  function loadLocations() {
    state.locations = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  }

  function saveLocations() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.locations));
  }

  return { loadLocations, saveLocations, STORAGE_KEY };
}));
