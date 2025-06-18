import appState from './state.mjs';
import { loadLocations as storageLoad, saveLocations as storageSave } from './storage.mjs';

export function setLocations(arr) { appState.locations = arr; }
export function getLocations() { return appState.locations; }
export function loadLocations() { storageLoad(); }
export function saveLocations() { storageSave(); }

