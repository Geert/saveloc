import appState from './state.mjs';

export const STORAGE_KEY = 'savedLocations';

export function loadLocations() {
  appState.locations = [];
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      appState.locations = parsed.filter(item => item && typeof item === 'object');
    }
  } catch (e) {
    // Leave locations empty when storage is inaccessible or corrupted
  }
}

export function saveLocations() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.locations));
  } catch (e) {
    // Ignore storage errors (e.g., quota exceeded, unavailable)
  }
}

