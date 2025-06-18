export function showNotification(message, type = 'info', duration = 3000) {
  const container = document.getElementById('notification-container');
  if (!container) return alert(message);
  const notification = document.createElement('div');
  notification.classList.add('notification', type);
  notification.textContent = message;
  container.appendChild(notification);
  window.setTimeout(() => notification.classList.add('show'), 10);
  window.setTimeout(() => {
    notification.classList.remove('show');
    window.setTimeout(() => {
      if (notification.parentNode === container) {
        container.removeChild(notification);
      }
    }, 500);
  }, duration);
}

