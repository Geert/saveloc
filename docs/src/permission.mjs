import { showNotification } from './ui.mjs';
import { t } from '../i18n.mjs';

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
          () => { showNotification(t('location_permission_denied'), 'error'); resolve(false); }
        );
      });
    }
    showNotification(t('location_permission_denied_enable'), 'error');
    return false;
  } catch (e) {
    return true;
  }
}

