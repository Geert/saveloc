// Main entry point
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.uiController && window.uiController.init) {
      window.uiController.init();
      window.saveLocTest = window.uiController.testApi;
    }
  });
})();
