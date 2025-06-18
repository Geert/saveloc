import uiController from './src/ui-controller.mjs';

// expose test API immediately so tests can access it before DOMContentLoaded
window.saveLocTest = uiController.testApi;

// run init once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  uiController.init();
});
