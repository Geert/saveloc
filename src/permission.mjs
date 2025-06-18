import { showNotification } from './ui.mjs';

export async function requestLocationPermission() {
  if (!navigator.permissions || !navigator.permissions.query) {
    return true;
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    if (status.state === 'granted') return true;
    if (status.state === 'prompt') {
      return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => { showNotification('Location permission denied.', 'error'); resolve(false); }
        );
      });
    }
    showNotification('Location permission denied. Enable it in your browser settings.', 'error');
    return false;
  } catch (e) {
    return true;
  }
}

export default { requestLocationPermission };
