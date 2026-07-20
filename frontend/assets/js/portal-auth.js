/* ============================================================
   Portal auth widget — injects a "Login" button into the navbar
   and a role-picker / login / register modal.

   Deliberately self-contained: it adds ONE nav item and injects its
   own scoped styles, so no existing page markup or stylesheet changes.
   Styling reuses the site's CSS variables (--green, --cream, …) so it
   matches the design without depending on any existing component.
   ============================================================ */
(function () {
  'use strict';

  // Same-origin by default (frontend is served by the backend). Override by setting
  // window.PORTAL_API_BASE before this script if the API lives elsewhere.
  var API = (window.PORTAL_API_BASE || '').replace(/\/$/, '');

  var ROLES = [
    { key: 'student',     label: 'Student',              hint: 'Notices, events, counselling, talent' },
    { key: 'institution', label: 'School / College',     hint: 'Manage students, notices & events' },
    { key: 'counsellor',  label: 'Counsellor',           hint: 'Counselling Centre staff' },
    { key: 'admin',       label: 'District Administrator', hint: 'Full portal administration' },
    { key: 'alumni',      label: 'Alumni',               hint: 'Mentor current students' },
  ];

  // ---- tiny fetch helper: always JSON, always credentialed (session cookie) ----
  async function api(path, opts) {
    opts = opts || {};
    var res = await fetch(API + path, {
      method: opts.method || 'GET',
      credentials: 'include',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    var data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) throw new Error((data && data.error) || 'Request failed. Please try again.');
    return data;
  }
  window.PortalAPI = api; // dashboards reuse this

  // ---- scoped styles ----
  var css = `
  .pa-navbtn{font-family:var(--font-body);font-weight:600;font-size:.78rem;
    color:var(--cream);background:var(--green);border:1.5px solid var(--green);
    border-radius:var(--radius-pill);padding:8px 20px;cursor:pointer;white-space:nowrap;
    transition:background .3s var(--ease),transform .3s var(--ease);margin-left:6px}
  .pa-navbtn:hover{background:var(--green-soft);transform:translateY(-2px)}
  .pa-navbtn.ghost{background:transparent;color:var(--green)}
  .pa-navbtn.ghost:hover{background:var(--green);color:var(--cream)}
  .pa-wrap{display:flex;align-items:center;gap:8px}
  .pa-hi{font-size:.72rem;color:var(--green);font-weight:600;white-space:nowrap;max-width:150px;
    overflow:hidden;text-overflow:ellipsis}
  .pa-overlay{position:fixed;inset:0;background:rgba(33,64,47,.42);backdrop-filter:blur(6px);
    display:none;align-items:center;justify-content:center;z-index:2000;padding:20px}
  .pa-overlay.open{display:flex}
  .pa-modal{background:var(--cream);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);
    width:100%;max-width:440px;max-height:92vh;overflow-y:auto;padding:34px 32px 30px;
    position:relative;font-family:var(--font-body);animation:pa-pop .35s var(--ease)}
  @keyframes pa-pop{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
  .pa-x{position:absolute;top:16px;right:18px;background:none;border:none;font-size:1.5rem;
    line-height:1;color:var(--green);cursor:pointer;opacity:.6}
  .pa-x:hover{opacity:1}
  .pa-title{font-family:var(--font-display);font-size:1.45rem;color:var(--green);margin:0 0 4px}
  .pa-sub{font-size:.85rem;color:var(--ink);opacity:.7;margin:0 0 22px}
  .pa-roles{display:grid;gap:10px}
  .pa-role{display:flex;flex-direction:column;text-align:left;gap:2px;padding:13px 16px;
    border:1.5px solid var(--sage);border-radius:16px;background:var(--white);cursor:pointer;
    transition:border-color .25s var(--ease),transform .25s var(--ease)}
  .pa-role:hover{border-color:var(--green);transform:translateX(3px)}
  .pa-role b{font-size:.95rem;color:var(--green)}
  .pa-role span{font-size:.75rem;color:var(--ink);opacity:.65}
  .pa-field{margin-bottom:14px}
  .pa-field label{display:block;font-size:.78rem;font-weight:600;color:var(--green);margin-bottom:6px}
  .pa-field input,.pa-field select{width:100%;padding:12px 14px;border:1.5px solid var(--sage);
    border-radius:12px;font-family:var(--font-body);font-size:.9rem;color:var(--ink);
    background:var(--white);box-sizing:border-box}
  .pa-field input:focus,.pa-field select:focus{outline:none;border-color:var(--green)}
  .pa-submit{width:100%;padding:13px;background:var(--green);color:var(--cream);border:none;
    border-radius:var(--radius-pill);font-family:var(--font-body);font-weight:600;font-size:.95rem;
    cursor:pointer;transition:background .3s var(--ease)}
  .pa-submit:hover{background:var(--green-soft)}
  .pa-submit:disabled{opacity:.6;cursor:not-allowed}
  .pa-err{background:#fbe9e2;color:#8a3520;font-size:.8rem;padding:10px 13px;border-radius:10px;
    margin-bottom:14px;display:none}
  .pa-err.show{display:block}
  .pa-ok{background:#e2efe4;color:#2b5233;font-size:.8rem;padding:10px 13px;border-radius:10px;
    margin-bottom:14px;display:none}
  .pa-ok.show{display:block}
  .pa-alt{text-align:center;font-size:.8rem;color:var(--ink);margin-top:16px}
  .pa-alt a{color:var(--terracotta);font-weight:600;cursor:pointer;text-decoration:underline}
  .pa-back{background:none;border:none;color:var(--green);font-size:.8rem;cursor:pointer;
    padding:0;margin-bottom:14px;opacity:.75}
  .pa-back:hover{opacity:1}
  @media (max-width:600px){.pa-hi{display:none}}
  `;
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---- modal construction ----
  var overlay = document.createElement('div');
  overlay.className = 'pa-overlay';
  overlay.innerHTML = '<div class="pa-modal" role="dialog" aria-modal="true"><button class="pa-x" aria-label="Close">&times;</button><div class="pa-body"></div></div>';
  document.body.appendChild(overlay);
  var body = overlay.querySelector('.pa-body');
  var selectedRole = null;
  var institutions = [];

  function open() { overlay.classList.add('open'); renderRolePicker(); }
  function close() { overlay.classList.remove('open'); }
  overlay.querySelector('.pa-x').addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  function h(html) { body.innerHTML = html; }

  function renderRolePicker() {
    selectedRole = null;
    h('<h2 class="pa-title">Sign in to the Portal</h2>'
      + '<p class="pa-sub">Choose your role to continue.</p>'
      + '<div class="pa-roles">'
      + ROLES.map(function (r) {
          return '<button class="pa-role" data-role="' + r.key + '"><b>' + r.label + '</b><span>' + r.hint + '</span></button>';
        }).join('')
      + '</div>');
    body.querySelectorAll('.pa-role').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedRole = btn.getAttribute('data-role');
        renderLogin();
      });
    });
  }

  function roleLabel(key) {
    var r = ROLES.filter(function (x) { return x.key === key; })[0];
    return r ? r.label : key;
  }

  function renderLogin() {
    h('<button class="pa-back">&larr; Change role</button>'
      + '<h2 class="pa-title">' + roleLabel(selectedRole) + ' login</h2>'
      + '<p class="pa-sub">Enter your credentials to open your dashboard.</p>'
      + '<div class="pa-err"></div>'
      + '<form class="pa-form">'
      + '<div class="pa-field"><label>Email</label><input type="email" name="email" required autocomplete="username"></div>'
      + '<div class="pa-field"><label>Password</label><input type="password" name="password" required autocomplete="current-password"></div>'
      + '<button class="pa-submit" type="submit">Sign in</button>'
      + '</form>'
      + ((selectedRole === 'student' || selectedRole === 'alumni')
          ? '<p class="pa-alt">New here? <a class="pa-register">Create an account</a></p>' : ''));

    body.querySelector('.pa-back').addEventListener('click', renderRolePicker);
    var reg = body.querySelector('.pa-register');
    if (reg) reg.addEventListener('click', renderRegister);

    body.querySelector('.pa-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector('.pa-submit'), err = body.querySelector('.pa-err');
      err.classList.remove('show');
      btn.disabled = true; btn.textContent = 'Signing in…';
      try {
        var out = await api('/api/auth/login', {
          method: 'POST',
          body: { email: f.email.value.trim(), password: f.password.value, role: selectedRole },
        });
        window.location.href = out.redirect || '/index.html';
      } catch (ex) {
        err.textContent = ex.message; err.classList.add('show');
        btn.disabled = false; btn.textContent = 'Sign in';
      }
    });
  }

  async function renderRegister() {
    if (!institutions.length) {
      try { institutions = await api('/api/institutions'); } catch (e) { institutions = []; }
    }
    var isStudent = selectedRole !== 'alumni';

    // A student must pick an institution, so with none on record sign-up cannot succeed.
    // Say so plainly instead of letting the browser show "Please select an item in the list"
    // against an empty dropdown, which reads like a broken form.
    if (isStudent && !institutions.length) {
      h('<button class="pa-back">&larr; Back to login</button>'
        + '<h2 class="pa-title">Sign-up not open yet</h2>'
        + '<p class="pa-sub">No schools or colleges have been added to the portal yet, so student '
        + 'accounts cannot be created. The District Administration adds institutions first — '
        + 'please check back shortly.</p>');
      body.querySelector('.pa-back').addEventListener('click', renderLogin);
      return;
    }
    h('<button class="pa-back">&larr; Back to login</button>'
      + '<h2 class="pa-title">Create a ' + roleLabel(selectedRole) + ' account</h2>'
      + '<p class="pa-sub">Your institution will verify you after sign-up.</p>'
      + '<div class="pa-err"></div><div class="pa-ok"></div>'
      + '<form class="pa-form">'
      + '<div class="pa-field"><label>Full name</label><input name="fullName" required></div>'
      + '<div class="pa-field"><label>Email</label><input type="email" name="email" required></div>'
      + '<div class="pa-field"><label>Password</label><input type="password" name="password" minlength="8" required></div>'
      + '<div class="pa-field"><label>School / College</label><select name="institutionId"' + (isStudent ? ' required' : '') + '>'
      + '<option value="">Select…</option>'
      + institutions.map(function (i) { return '<option value="' + i.id + '">' + i.name + '</option>'; }).join('')
      + '</select></div>'
      + (isStudent ? '<div class="pa-field"><label>Class / Year</label><input name="classYear" placeholder="e.g. 12th, B.A. 2nd Year"></div>' : '')
      + '<button class="pa-submit" type="submit">Create account</button>'
      + '</form>');

    body.querySelector('.pa-back').addEventListener('click', renderLogin);
    body.querySelector('.pa-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector('.pa-submit');
      var err = body.querySelector('.pa-err'), ok = body.querySelector('.pa-ok');
      err.classList.remove('show'); ok.classList.remove('show');
      btn.disabled = true; btn.textContent = 'Creating…';
      try {
        await api('/api/auth/register', {
          method: 'POST',
          body: {
            fullName: f.fullName.value.trim(), email: f.email.value.trim(),
            password: f.password.value, role: selectedRole,
            institutionId: f.institutionId.value || null,
            classYear: f.classYear ? f.classYear.value : null,
          },
        });
        ok.textContent = 'Account created! You can sign in now.'; ok.classList.add('show');
        setTimeout(renderLogin, 1400);
      } catch (ex) {
        err.textContent = ex.message; err.classList.add('show');
        btn.disabled = false; btn.textContent = 'Create account';
      }
    });
  }

  // ---- navbar injection ----
  var HOME_FOR_ROLE = {
    admin: '/admin.html', counsellor: '/counsellor.html', institution: '/institution.html',
    student: '/student.html', alumni: '/alumni.html',
  };

  async function mountNav() {
    var nav = document.querySelector('.navbar .nav-inner') || document.querySelector('.navbar');
    if (!nav) return;
    var wrap = document.createElement('div');
    wrap.className = 'pa-wrap';
    nav.appendChild(wrap);

    // Reflect existing session if there is one.
    var me = null;
    try { me = await api('/api/auth/me'); } catch (e) { /* not signed in */ }

    if (me && me.user) {
      var home = HOME_FOR_ROLE[me.user.role] || '/index.html';
      wrap.innerHTML = '<span class="pa-hi">Hi, ' + me.user.fullName.split(' ')[0] + '</span>'
        + '<a class="pa-navbtn" href="' + home + '">Dashboard</a>'
        + '<button class="pa-navbtn ghost pa-logout">Logout</button>';
      wrap.querySelector('.pa-logout').addEventListener('click', async function () {
        try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) {}
        window.location.href = '/index.html';
      });
    } else {
      var b = document.createElement('button');
      b.className = 'pa-navbtn';
      b.textContent = 'Login';
      b.addEventListener('click', open);
      wrap.appendChild(b);
    }
  }

  // Allow a page to force the modal open (e.g. a "Login required" redirect).
  window.PortalAuth = { open: open, close: close, api: api };

  /* ----------------------------------------------------------------
     Shared counselling helpers.

     The public booking page and the student dashboard must produce IDENTICAL records,
     so the topic list and the description layout live here once rather than being
     re-typed in each page and drifting apart.
     ---------------------------------------------------------------- */
  window.PortalCounselling = {
    // Values must match the request_type CHECK constraint in the database.
    TOPICS: [
      { value: 'stress',        label: 'Stress / Emotional well-being' },
      { value: 'academic',      label: 'Studies & Exams' },
      { value: 'career',        label: 'Career confusion' },
      { value: 'mental_health', label: 'Psychological well-being' },
      { value: 'personal',      label: 'Family / Personal' },
      { value: 'other',         label: 'Other' },
    ],

    topicOptions: function (selected) {
      return '<option value="">Select a topic</option>' + this.TOPICS.map(function (t) {
        return '<option value="' + t.value + '"' + (t.value === selected ? ' selected' : '') + '>' + t.label + '</option>';
      }).join('');
    },

    /**
     * Builds the request description. One layout everywhere, so a counsellor reads the
     * same block whether the request came from the public site or a student's dashboard.
     */
    buildDescription: function (d) {
      var lines = [];
      if (d.name) lines.push('Name: ' + d.name);
      if (d.phone) lines.push('Phone: ' + d.phone);
      if (d.classYear) lines.push('Class/Year: ' + d.classYear);
      if (d.institution) lines.push('Institution: ' + d.institution);
      if (d.counsellor) lines.push('Preferred counsellor: ' + d.counsellor);
      return (d.message ? d.message + '\n\n' : '') + lines.join('\n');
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountNav);
  else mountNav();
})();
