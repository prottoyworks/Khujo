/* ============================================================
   ALERTS — Toast notifications + bell-dropdown rendering
   The backend creates persistent alerts on its own (see
   routes/lost-reports.js, routes/found-reports.js). This module
   handles client-side feedback (toasts) and renders the alert
   list returned by GET /api/alerts.
   ============================================================ */

const Alerts = (() => {
  const TYPES = {
    LOST_REPORTED: 'LOST_REPORTED',
    FOUND_REPORTED: 'FOUND_REPORTED',
    FOUND_VERIFIED: 'FOUND_VERIFIED',
    CASE_CLOSED: 'CASE_CLOSED',
  };

  const TONE = {
    LOST_REPORTED: 'danger',
    FOUND_REPORTED: 'warning',
    FOUND_VERIFIED: 'success',
    CASE_CLOSED: 'success',
  };

  const TITLE = {
    LOST_REPORTED: 'Missing person reported',
    FOUND_REPORTED: 'New sighting',
    FOUND_VERIFIED: 'Sighting verified',
    CASE_CLOSED: 'Case closed',
  };

  function getContainer() {
    let c = document.querySelector('.toast-container');
    if (!c) {
      c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function showToast(message, type = 'info') {
    const container = getContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const text = document.createElement('span');
    text.textContent = message;

    const close = document.createElement('button');
    close.className = 'toast__close';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '\u00d7';

    toast.appendChild(text);
    toast.appendChild(close);
    container.appendChild(toast);

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      toast.classList.add('toast--out');
      setTimeout(() => toast.remove(), 300);
    };
    close.addEventListener('click', dismiss);
    setTimeout(dismiss, 4000);
  }

  // Backend already persists the alert as part of the same write
  // (POST /lost-reports, /found-reports, etc.). push() is a UX
  // shortcut that surfaces an instant toast — no server round-trip.
  function push(type, message /*, relatedId */) {
    const tone = TONE[type] || 'info';
    showToast(message, tone);
  }

  function renderDropdownFromData(alerts) {
    if (!alerts || !alerts.length) {
      return '<div class="alert-dropdown__empty">No alerts yet</div>';
    }
    return alerts
      .map((a) => {
        const tone = TONE[a.type] || 'info';
        const title = TITLE[a.type] || a.type;
        const itemCls = a.read
          ? 'alert-dropdown__item'
          : 'alert-dropdown__item alert-dropdown__item--unread';
        const msg = Utils.escapeHtml(a.message || '');
        return `
          <div class="${itemCls}">
            <div class="alert-dropdown__dot alert-dropdown__dot--${tone}"></div>
            <div class="alert-dropdown__body">
              <div class="alert-dropdown__title">${Utils.escapeHtml(title)}</div>
              <div class="alert-dropdown__msg" title="${msg}">${msg}</div>
              <div class="alert-dropdown__time">${Utils.timeAgo(a.createdAt)}</div>
            </div>
          </div>`;
      })
      .join('');
  }

  return { TYPES, showToast, push, renderDropdownFromData };
})();
