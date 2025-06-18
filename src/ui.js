(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./state'));
  } else {
    root.ui = factory(root.appState);
  }
}(typeof self !== 'undefined' ? self : this, function (state) {
  function showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notification-container');
    if (!container) return alert(message);
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode === container) {
          container.removeChild(notification);
        }
      }, 500);
    }, duration);
  }

  return { showNotification };
}));
