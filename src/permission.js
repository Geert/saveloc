(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./ui'));
  } else {
    root.permission = factory(root.ui);
  }
}(typeof self !== 'undefined' ? self : this, function (ui) {
  async function requestLocationPermission() {
    if (!navigator.permissions || !navigator.permissions.query) {
      return true;
    }
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      if (status.state === 'granted') return true;
      if (status.state === 'prompt') {
        return new Promise(resolve => {
          navigator.geolocation.getCurrentPosition(() => resolve(true), () => { ui.showNotification('Location permission denied.', 'error'); resolve(false); });
        });
      }
      ui.showNotification('Location permission denied. Enable it in your browser settings.', 'error');
      return false;
    } catch (e) {
      return true;
    }
  }
  return { requestLocationPermission };
}));
