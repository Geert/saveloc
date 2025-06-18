import uiController from './src/ui-controller.mjs';
import { applyTranslations } from './i18n.mjs';

// expose test API immediately so tests can access it before DOMContentLoaded
window.saveLocTest = uiController.testApi;

// run init once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  uiController.init();
});
