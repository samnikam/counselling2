/* ============================================================
   Dashboard core — shared by all five role dashboards.
   Handles: session guard, top bar, section nav, toasts, small
   DOM/format helpers, and the credentialed fetch wrapper.
   ============================================================ */
(function () {
  'use strict';

  var API = (window.PORTAL_API_BASE || '').replace(/\/$/, '');
  var COPYRIGHT_YEAR = new Date().getFullYear();

  // ---- sidebar icons ----
  // Small line icons (inherit the button's colour via currentColor) so every menu item is
  // instantly recognisable. Referenced by name from each dashboard's `sections[].icon`.
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
      + 'stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">' + inner + '</svg>';
  }
  var ICONS = {
    grid: svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'),
    users: svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    building: svg('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>'),
    heart: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>'),
    cap: svg('<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5"/>'),
    bell: svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
    calendar: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    chat: svg('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>'),
    message: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
    compass: svg('<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.9 6.4-6.4 2.9 2.9-6.4 6.4-2.9z"/>'),
    star: svg('<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>'),
    image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
    megaphone: svg('<path d="M3 11l18-5v12L3 14z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'),
    chart: svg('<path d="M12 20V10M18 20V4M6 20v-4"/>'),
    activity: svg('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    clipboard: svg('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>'),
    user: svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  };

  async function api(path, opts) {
    opts = opts || {};
    var isForm = opts.body instanceof FormData;
    var res = await fetch(API + path, {
      method: opts.method || 'GET',
      credentials: 'include',
      headers: opts.body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? (isForm ? opts.body : JSON.stringify(opts.body)) : undefined,
    });
    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401) { window.location.href = '/index.html'; throw new Error('Session expired'); }
    if (!res.ok) throw new Error((data && data.error) || 'Request failed.');
    return data;
  }

  // ---- format helpers ----
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(s) {
    if (!s) return '—';
    var d = new Date(s);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtDateTime(s) {
    if (!s) return '—';
    var d = new Date(s);
    if (isNaN(d)) return '—';
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  var toastEl;
  function toast(msg, isErr) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.className = 'toast show' + (isErr ? ' err' : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.className = 'toast' + (isErr ? ' err' : ''); }, 3000);
  }

  /**
   * Compact ownership footer for dashboard pages. GIGW requires ownership information
   * and the statutory policy links on every page, not only the public ones — but the
   * full four-column public footer would crowd an app shell, so this is the short form.
   */
  function buildDashFooter() {
    var f = document.createElement('footer');
    f.className = 'dash-footer';
    f.innerHTML =
      '<div class="dash-footer-in">'
      + '<p><strong>Content owned, updated and maintained by</strong> the Counselling &amp; Youth Development Center, '
      + 'District Administration Anantnag, Government of Jammu &amp; Kashmir.</p>'
      + '<p>Helpline: <a href="tel:+911932234100">+91 1932 234 100</a> &middot; '
      + '<a href="mailto:info@anantnagyouth.in">info@anantnagyouth.in</a> &middot; '
      + 'Mon&ndash;Sat, 10:00 AM &ndash; 5:00 PM</p>'
      + '<nav class="dash-footer-links" aria-label="Website policies">'
      + '<a href="policies.html#terms">Terms &amp; Conditions</a>'
      + '<a href="policies.html#privacy">Privacy Policy</a>'
      + '<a href="policies.html#hyperlinking">Hyperlinking Policy</a>'
      + '<a href="policies.html#copyright">Copyright Policy</a>'
      + '<a href="policies.html#disclaimer">Disclaimer</a>'
      + '<a href="policies.html#accessibility">Accessibility Statement</a>'
      + '<a href="policies.html#screen-reader">Screen Reader Access</a>'
      + '<a href="policies.html#grievance">Grievance Redressal</a>'
      + '<a href="policies.html#feedback">Feedback</a>'
      + '<a href="policies.html#help">Help</a>'
      + '</nav>'
      + '<p class="dash-footer-base"><span>&copy; ' + COPYRIGHT_YEAR
      + ' District Administration, Anantnag, Government of Jammu &amp; Kashmir.</span>'
      + '<a href="https://www.india.gov.in" target="_blank" rel="noopener">india.gov.in &mdash; National Portal of India</a></p>'
      + '</div>';
    return f;
  }

  /**
   * Boots a dashboard: verifies the session, enforces the required role, builds the
   * top bar + side nav, and wires section switching. Returns the signed-in user.
   *
   * @param {Object} cfg { role, title, sections:[{id,label,badge?}], onSection(id) }
   */
  async function boot(cfg) {
    document.body.classList.add('dash-body');

    var me;
    try { me = await api('/api/auth/me'); } catch (e) { window.location.href = '/index.html'; return; }
    var user = me.user;

    // A signed-in user on the wrong dashboard is bounced to their own — not left staring
    // at data they can't load. This is UX; the API still enforces the real boundary.
    if (user.role !== cfg.role) {
      var home = { admin: '/admin.html', counsellor: '/counsellor.html', institution: '/institution.html', student: '/student.html', alumni: '/alumni.html' }[user.role];
      window.location.href = home || '/index.html';
      return;
    }

    // Force a password change on first login for staff/managed accounts.
    if (user.mustChangePassword) {
      promptPasswordChange();
    }

    buildChrome(cfg, user);
    window.DASH.user = user;
    accessibilityEnhance();   // GIGW/WCAG: table headers + label associations
    startIdleGuard();         // Session-timeout warning + auto sign-out

    // Open the first section (or the one named in the URL hash).
    var initial = (location.hash || '').replace('#', '') || cfg.sections[0].id;
    switchSection(cfg, initial);
    return user;
  }

  /**
   * Additive accessibility pass for the JS-rendered dashboards (GIGW / WCAG 2.1 AA).
   * Watches the shell and, as views render, (a) gives every table header a scope,
   * and (b) programmatically associates each label with its control. Purely
   * attribute-level — no visual change.
   */
  var a11yUid = 0;
  function associateLabels(root) {
    root.querySelectorAll('label:not([for])').forEach(function (lab) {
      // Skip labels that already wrap their own control.
      if (lab.querySelector('input, select, textarea')) return;
      var parent = lab.parentElement;
      if (!parent) return;
      var ctrl = parent.querySelector('input, select, textarea');
      if (!ctrl) return;
      if (!ctrl.id) ctrl.id = 'f-a11y-' + (++a11yUid);
      lab.setAttribute('for', ctrl.id);
    });
  }
  function scopeTables(root) {
    root.querySelectorAll('thead th:not([scope])').forEach(function (th) {
      th.setAttribute('scope', 'col');
    });
    root.querySelectorAll('table:not([data-a11y])').forEach(function (tbl) {
      tbl.setAttribute('data-a11y', '1');
      if (!tbl.querySelector('caption')) {
        var cap = document.createElement('caption');
        cap.className = 'sr-only';
        // Nearest section heading gives the table a meaningful name.
        var h = document.querySelector('#dash-main .dash-h');
        cap.textContent = (h ? h.textContent + ' — ' : '') + 'data table';
        tbl.insertBefore(cap, tbl.firstChild);
      }
    });
  }
  function accessibilityEnhance() {
    var run = function () {
      var main = document.getElementById('dash-main');
      if (main) { associateLabels(main); scopeTables(main); }
      document.querySelectorAll('.pa-overlay .pa-modal').forEach(associateLabels);
    };
    run();
    var obs = new MutationObserver(function () { run(); });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Session-timeout guard (GIGW/security best practice). Any activity resets the timer.
   * At 25 minutes idle a warning appears; at 30 minutes the session is ended and the
   * user is returned to the home page. Times are generous so active users never see it.
   */
  function startIdleGuard() {
    var WARN_MS = 25 * 60 * 1000, OUT_MS = 30 * 60 * 1000;
    var warnT, outT, warnEl;
    function clearWarn() { if (warnEl) { warnEl.remove(); warnEl = null; } }
    async function signOut() {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) {}
      window.location.href = '/index.html';
    }
    function showWarn() {
      if (warnEl) return;
      warnEl = document.createElement('div');
      warnEl.className = 'pa-overlay open';
      warnEl.innerHTML = '<div class="pa-modal"><h2 class="pa-title">Still there?</h2>'
        + '<p class="pa-sub">For your security, you will be signed out shortly due to inactivity.</p>'
        + '<button class="pa-submit" type="button">Stay signed in</button></div>';
      document.body.appendChild(warnEl);
      warnEl.querySelector('.pa-submit').addEventListener('click', reset);
    }
    function reset() {
      clearWarn();
      clearTimeout(warnT); clearTimeout(outT);
      warnT = setTimeout(showWarn, WARN_MS);
      outT = setTimeout(signOut, OUT_MS);
    }
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, function () { if (!warnEl) reset(); }, { passive: true });
    });
    reset();
  }

  function buildChrome(cfg, user) {
    var top = document.createElement('header');
    top.className = 'dash-top';
    top.innerHTML =
      '<a class="brand" href="/index.html" style="color:inherit;text-decoration:none">'
      + '<span class="mark">A</span><span>Anantnag Youth Portal<small>' + esc(cfg.title) + '</small></span></a>'
      + '<span class="spacer"></span>'
      + '<span class="who"><b>' + esc(user.fullName) + '</b><span class="role-chip">' + esc(user.role) + '</span></span>'
      + '<button class="dash-btn ghost sm" id="dash-pw">Password</button>'
      + '<button class="dash-btn sm" id="dash-logout">Logout</button>';
    document.body.insertBefore(top, document.body.firstChild);

    // Skip-to-content link (GIGW/WCAG 2.4.1) — first focusable element on the page.
    var skip = document.createElement('a');
    skip.href = '#dash-main';
    skip.className = 'skip-link';
    skip.textContent = 'Skip to main content';
    document.body.insertBefore(skip, document.body.firstChild);

    var shell = document.createElement('div');
    shell.className = 'dash-shell';
    var nav = document.createElement('nav');
    nav.className = 'dash-nav';
    // Sections may carry an optional `group` (renders a heading when it changes) and an
    // optional `icon` (name from ICONS). Both are additive — sections without them still work.
    var lastGroup = null;
    nav.innerHTML = cfg.sections.map(function (s) {
      var out = '';
      if (s.group && s.group !== lastGroup) {
        lastGroup = s.group;
        out += '<div class="dash-nav-group">' + esc(s.group) + '</div>';
      }
      out += '<button data-sec="' + s.id + '">'
        + (s.icon && ICONS[s.icon] ? '<span class="ic">' + ICONS[s.icon] + '</span>' : '')
        + '<span class="lbl">' + esc(s.label) + '</span>'
        + (s.badge ? '<span class="badge" data-badge="' + s.id + '" style="display:none"></span>' : '') + '</button>';
      return out;
    }).join('');
    var main = document.createElement('main');
    main.className = 'dash-main';
    main.id = 'dash-main';
    main.setAttribute('tabindex', '-1');
    // Each page's onSection(id) renders into #dash-main, so no pre-built section divs are needed.
    shell.appendChild(nav);
    shell.appendChild(main);
    document.body.appendChild(shell);
    document.body.appendChild(buildDashFooter());

    nav.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { switchSection(cfg, b.getAttribute('data-sec')); });
    });
    document.getElementById('dash-logout').addEventListener('click', async function () {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) {}
      window.location.href = '/index.html';
    });
    document.getElementById('dash-pw').addEventListener('click', promptPasswordChange);
  }

  function switchSection(cfg, id) {
    var nav = document.querySelector('.dash-nav');
    var valid = cfg.sections.some(function (s) { return s.id === id; });
    if (!valid) id = cfg.sections[0].id;
    nav.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-sec') === id);
    });
    history.replaceState(null, '', '#' + id);
    cfg.onSection(id);
  }

  function setBadge(id, count) {
    var el = document.querySelector('[data-badge="' + id + '"]');
    if (!el) return;
    if (count > 0) { el.textContent = count; el.style.display = ''; }
    else el.style.display = 'none';
  }

  // Simple modal-free password change using a lightweight overlay.
  function promptPasswordChange() {
    var ov = document.createElement('div');
    ov.className = 'pa-overlay open';
    ov.innerHTML = '<div class="pa-modal"><button class="pa-x">&times;</button>'
      + '<h2 class="pa-title">Change password</h2><p class="pa-sub">Choose a new password (min 8 characters).</p>'
      + '<div class="pa-err"></div>'
      + '<form><div class="pa-field"><label>Current password</label><input type="password" name="cur" required></div>'
      + '<div class="pa-field"><label>New password</label><input type="password" name="nw" minlength="8" required></div>'
      + '<button class="pa-submit">Update password</button></form></div>';
    document.body.appendChild(ov);
    function close() { ov.remove(); }
    ov.querySelector('.pa-x').addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    ov.querySelector('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, err = ov.querySelector('.pa-err');
      try {
        await api('/api/auth/change-password', { method: 'POST', body: { currentPassword: f.cur.value, newPassword: f.nw.value } });
        close(); toast('Password updated.');
      } catch (ex) { err.textContent = ex.message; err.classList.add('show'); }
    });
  }

  /**
   * Opens a form in a modal. Used by every "+ Add" button so the dashboard shows data
   * by default and only surfaces a form when the user asks for one.
   *
   * @param {string} title   Heading shown in the modal
   * @param {string} fields  Inner HTML of the form (labels + inputs)
   * @param {Function} onSubmit  async (formEl) => {}; throw to show an error, resolve to close
   */
  function modal(title, fields, onSubmit, submitLabel) {
    var ov = document.createElement('div');
    ov.className = 'pa-overlay open';
    ov.innerHTML = '<div class="pa-modal"><button class="pa-x" aria-label="Close">&times;</button>'
      + '<h2 class="pa-title">' + esc(title) + '</h2>'
      + '<div class="pa-err"></div>'
      + '<form class="dash-modal-form f">' + fields
      + '<button class="pa-submit" type="submit">' + esc(submitLabel || 'Save') + '</button></form></div>';
    document.body.appendChild(ov);

    function close() { ov.remove(); }
    ov.querySelector('.pa-x').addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    // Esc closes — but only this modal, and only while it is on screen.
    function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } }
    document.addEventListener('keydown', onKey);

    ov.querySelector('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = ov.querySelector('.pa-submit'), err = ov.querySelector('.pa-err');
      err.classList.remove('show');
      btn.disabled = true; btn.textContent = 'Saving…';
      try {
        await onSubmit(e.target);
        close(); document.removeEventListener('keydown', onKey);
      } catch (ex) {
        err.textContent = ex.message; err.classList.add('show');
        btn.disabled = false; btn.textContent = submitLabel || 'Save';
      }
    });
    return { close: close };
  }

  /** Section header with an optional "+" action button on the right. */
  function header(title, sub, addLabel) {
    return '<div class="dash-head-row">'
      + '<div><h1 class="dash-h">' + esc(title) + '</h1><p class="dash-sub">' + esc(sub) + '</p></div>'
      + (addLabel ? '<button class="dash-btn dash-add" id="dash-add">+ ' + esc(addLabel) + '</button>' : '')
      + '</div>';
  }

  /**
   * A date field + a time field, side by side.
   *
   * Deliberately NOT <input type="datetime-local">: that control's native picker stays open
   * after a date is chosen and offers only "Clear"/"Today", with no clear way to confirm —
   * users get stuck in it. Two separate pickers each close on selection.
   */
  function dtFields(label, name) {
    return '<div class="fld"><label>' + esc(label) + '</label>'
      + '<div style="display:flex;gap:9px">'
      + '<input type="date" name="' + name + 'Date" required style="flex:1;min-width:0">'
      + '<input type="time" name="' + name + 'Time" required style="flex:1;min-width:0">'
      + '</div></div>';
  }

  /** Reads a dtFields() pair back as an ISO-ish string the API accepts ("2026-07-17T15:40"). */
  function dtValue(form, name) {
    var d = form[name + 'Date'].value, t = form[name + 'Time'].value;
    if (!d || !t) throw new Error('Please choose both a date and a time.');
    return d + 'T' + t;
  }

  /**
   * The Alerts view — shared by every role's dashboard so an admin announcement reaches
   * students, counsellors, institutions and alumni identically. Renders into #dash-main.
   * Routine notices deliberately never appear here (they live in the Notices section).
   */
  async function alertsView(badgeId) {
    var el = document.getElementById('dash-main');
    el.innerHTML = header('Alerts', 'Important announcements from the District Administration.')
      + '<div style="margin-bottom:14px"><button class="dash-btn sm ghost" style="color:var(--green);border-color:var(--sage)" id="dash-markall">Mark all read</button></div>'
      + '<div id="dash-alerts"><div class="empty">Loading…</div></div>';

    var n = await api('/api/notifications');
    document.getElementById('dash-markall').onclick = async function () {
      await api('/api/notifications/read-all', { method: 'PUT' });
      alertsView(badgeId);
    };
    document.getElementById('dash-alerts').innerHTML = n.notifications.length
      ? n.notifications.map(function (x) {
          return '<div class="item" style="' + (x.is_read ? 'opacity:.6' : 'border-left:3px solid var(--terracotta)') + '">'
            + '<div class="grow"><h4>' + esc(x.title) + (x.is_read ? '' : ' <span class="pill red">New</span>') + '</h4>'
            + '<p style="white-space:pre-line">' + esc(x.message) + '</p>'
            + '<div class="meta">' + fmtDateTime(x.created_at) + '</div></div></div>';
        }).join('')
      : '<div class="empty">No alerts yet.</div>';
    if (badgeId) setBadge(badgeId, n.unreadCount);
  }

  /** Keeps the sidebar unread count in step without rendering the whole view. */
  async function refreshAlertBadge(badgeId) {
    try { var n = await api('/api/notifications'); setBadge(badgeId, n.unreadCount); } catch (e) { /* not fatal */ }
  }

  /** Renders a row of stat tiles. items = [[label, value, colourClass], …] */
  function stats(items) {
    return '<div class="stat-grid">' + items.map(function (x) {
      return '<div class="stat ' + (x[2] || '') + '"><div class="n">' + x[1] + '</div><div class="l">' + esc(x[0]) + '</div></div>';
    }).join('') + '</div>';
  }

  window.DASH = { api: api, esc: esc, fmtDate: fmtDate, fmtDateTime: fmtDateTime, toast: toast, boot: boot, setBadge: setBadge, switchSection: switchSection, modal: modal, header: header, stats: stats, dtFields: dtFields, dtValue: dtValue, alertsView: alertsView, refreshAlertBadge: refreshAlertBadge };
})();
