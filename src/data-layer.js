(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./state'), require('./storage'));
  } else {
    root.dataLayer = factory(root.appState, root.storage);
  }
}(typeof self !== 'undefined' ? self : this, function(state, storage) {
  function setLocations(arr) { state.locations = arr; }
  function getLocations() { return state.locations; }
  function loadLocations() { storage.loadLocations(); }
  function saveLocations() { storage.saveLocations(); }
  return { setLocations, getLocations, loadLocations, saveLocations };
}));
