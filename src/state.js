(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.appState = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  return {
    locations: [],
    map: null,
    markersLayer: null,
    markers: {},
    isInEditMode: false
  };
}));
