(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.appState = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  const state = {
    locations: [],
    map: null,
    markersLayer: null,
    markers: {},
    isInEditMode: false
  };

  state.setLocations = arr => { state.locations = arr; };
  state.getLocations = () => state.locations;

  return state;
}));
