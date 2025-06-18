(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./state'));
  } else {
    root.storage = factory(root.appState);
  }
}(typeof self !== 'undefined' ? self : this, function (state) {
  const STORAGE_KEY = 'savedLocations';

  function loadLocations() {
    state.locations = [];
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state.locations = parsed.filter(item => item && typeof item === 'object');
      }
    } catch (e) {
      // Leave locations empty when storage is inaccessible or corrupted
    }
  }

  function saveLocations() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.locations));
    } catch (e) {
      // Ignore storage errors (e.g., quota exceeded, unavailable)
    }
  }

  return { loadLocations, saveLocations, STORAGE_KEY };
}));
