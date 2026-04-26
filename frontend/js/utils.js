/* ============================================================
   UTILS — Shared helpers
   ============================================================ */

const Utils = (() => {

  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function timeAgo(isoString) {
    if (!isoString) return '';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)   return 'just now';
    if (mins  < 60)  return `${mins}m ago`;
    if (hours < 24)  return `${hours}h ago`;
    if (days  < 30)  return `${days}d ago`;
    return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Resize image file via canvas and return base64 data URI
  function fileToBase64(file, maxW = 400, maxH = 500) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Not an image file'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const ratio = Math.min(maxW / width, maxH / height, 1);
          width  = Math.round(width  * ratio);
          height = Math.round(height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width  = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Inject the shared nav bar into #nav-placeholder
  function renderNav() {
    const placeholder = document.getElementById('nav-placeholder');
    if (!placeholder) return;
    const loggedIn = Auth.isLoggedIn();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    placeholder.innerHTML = `
      <nav class="nav">
        <div class="container nav__inner">
          <a href="index.html" class="nav__brand">Khujo</a>
          <div class="nav__actions">
            ${loggedIn ? `
              <div class="nav__alert-wrap">
                <button class="nav__icon-btn" id="alert-bell-btn" aria-label="Alerts" title="Alerts">
                  <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </button>
                <div class="alert-dropdown" id="alert-dropdown" hidden>
                  <div class="alert-dropdown__empty">Loading...</div>
                </div>
              </div>
              <a href="profile.html" class="nav__icon-btn ${currentPage === 'profile.html' ? 'nav__icon-btn--active' : ''}" title="Profile">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </a>
              <button class="nav__icon-btn" onclick="Auth.logout()" title="Sign out">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
      </nav>
    `;

    // Alert dropdown toggle — load alerts from API
    const bellBtn       = document.getElementById('alert-bell-btn');
    const alertDropdown = document.getElementById('alert-dropdown');
    if (bellBtn && alertDropdown) {
      bellBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isHidden = alertDropdown.hidden;
        alertDropdown.hidden = !isHidden;
        if (!isHidden) return;

        // Fetch alerts from backend
        try {
          const alerts = await API.getAlerts();
          alertDropdown.innerHTML = Alerts.renderDropdownFromData(alerts);
          API.markAllAlertsRead().catch(() => {});
          const badge = bellBtn.querySelector('.nav__badge');
          if (badge) badge.remove();
        } catch {
          alertDropdown.innerHTML = '<div class="alert-dropdown__empty">Could not load alerts</div>';
        }
      });
      document.addEventListener('click', () => { alertDropdown.hidden = true; });
      alertDropdown.addEventListener('click', (e) => e.stopPropagation());
    }
  }

  // Render a person ID card (used in multiple pages)
  // type: 'lost' | 'family'
  function renderPersonCard(data, type, opts = {}) {
    const { clickable = false, selectable = false, selected = false } = opts;
    const photo = data.photo
      ? `<img src="${escapeHtml(data.photo)}" alt="${escapeHtml(data.name)}" class="id-card__photo">`
      : `<div class="id-card__photo id-card__photo--placeholder">
           <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
             <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
             <circle cx="12" cy="7" r="4"/>
           </svg>
         </div>`;

    let badge = '';
    if (type === 'lost') {
      if (data.finalFoundVerdict) {
        badge = `<span class="badge badge--success">CLOSED</span>`;
      } else if (data.status === 'found') {
        badge = `<span class="badge badge--success">FOUND</span>`;
      } else {
        badge = `<span class="badge badge--danger">MISSING</span>`;
      }
    }

    let subtitle = '';
    if (type === 'lost') {
      // Sighting info can be passed via opts.sightingCount / opts.hasVerified
      if (opts.sightingCount > 0) {
        subtitle = opts.hasVerified
          ? `<span class="badge badge--success badge--sm">Verified sighting</span>`
          : `<span class="badge badge--warning badge--sm">${opts.sightingCount} unverified report${opts.sightingCount > 1 ? 's' : ''}</span>`;
      }
    } else if (type === 'family') {
      subtitle = `<span class="id-card__relation">${escapeHtml(data.relationship || '')}</span>`;
    }

    let infoRows = '';
    if (type === 'lost') {
      infoRows = `
        <div class="id-card__info-row"><span class="id-card__label">Last seen</span><span class="id-card__value">${escapeHtml(data.lastSeenLocation)}</span></div>
        <div class="id-card__info-row"><span class="id-card__label">Clothes</span><span class="id-card__value">${escapeHtml(data.lastSeenClothes)}</span></div>
        <div class="id-card__info-row"><span class="id-card__label">Reported</span><span class="id-card__value">${timeAgo(data.createdAt)}</span></div>
      `;
    } else if (type === 'family') {
      infoRows = `
        <div class="id-card__info-row"><span class="id-card__label">Description</span><span class="id-card__value">${escapeHtml((data.description || '').slice(0, 80))}${data.description && data.description.length > 80 ? '…' : ''}</span></div>
      `;
    }

    const attrs = clickable ? `role="link" tabindex="0" style="cursor:pointer"` : '';
    const selectedClass = selected ? ' id-card--selected' : '';

    return `
      <div class="id-card${selectedClass}" ${attrs} data-id="${escapeHtml(data.id)}">
        ${badge ? `<div class="id-card__badge-wrap">${badge}</div>` : ''}
        <div class="id-card__top">
          ${photo}
          <div class="id-card__name">${escapeHtml(data.name)}</div>
          <div class="id-card__subtitle">${subtitle}</div>
        </div>
        <div class="id-card__divider"></div>
        <div class="id-card__info">${infoRows}</div>
        ${selectable ? `<button class="btn btn--sm btn--outline id-card__select-btn" data-id="${escapeHtml(data.id)}">Select</button>` : ''}
      </div>
    `;
  }

  return { generateId, escapeHtml, timeAgo, fileToBase64, renderNav, renderPersonCard };

})();
