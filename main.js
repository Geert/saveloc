// Main entry point
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.appController && window.appController.init) {
      window.appController.init();
      window.saveLocTest = window.appController.testApi;
    }
  });
})();
