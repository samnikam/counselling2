const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { one, run } = require('../config/db');
const env = require('../config/env');
const { ah, requireAuth, logActivity } = require('../middleware/auth');
const { upload, publicPath } = require('../middleware/upload');

const router = express.Router();

// Brute-force protection on the credential endpoints only (PDF §5.14).
// Strict in production; relaxed in development, where switching between the five role
// accounts legitimately burns through attempts and a 15-minute lockout just blocks work.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.IS_PROD ? 10 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  // Must be JSON — the frontend does res.json() on every response, and the default
  // plain-text body would throw during parsing and fail silently in the UI.
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

/** Shape returned to the client. Never includes password_hash. */
function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role,
    institutionId: u.institution_id,
    institutionName: u.institution_name || null,
    classYear: u.class_year,
    phone: u.phone,
    bio: u.bio,
    avatar: u.avatar,
    isVerified: u.is_verified,
    mustChangePassword: u.must_change_password,
  };
}

// Where each role lands after signing in. Single source of truth, shared with the frontend
// so the login modal never needs its own copy of this mapping.
const HOME_FOR_ROLE = {
  admin: '/admin.html',
  counsellor: '/counsellor.html',
  institution: '/institution.html',
  student: '/student.html',
  alumni: '/alumni.html',
};

// ─── Register (students and alumni self-register; staff accounts are created by an admin) ───
router.post('/register', ah(async (req, res) => {
  const { email, password, fullName, role, institutionId, classYear, phone } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  // Self-registration can only ever create a student or an alumni. Accepting `role` from the
  // body without this check would let anyone POST role:"admin" and own the district's data.
  const requestedRole = role === 'alumni' ? 'alumni' : 'student';
  if (requestedRole === 'student' && !institutionId) {
    return res.status(400).json({ error: 'Please select your school or college.' });
  }

  const normalisedEmail = String(email).trim().toLowerCase();
  const existing = await one('SELECT id FROM users WHERE email = $1', [normalisedEmail]);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const { row } = await run(
    `INSERT INTO users (email, password_hash, full_name, role, institution_id, class_year, phone)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      normalisedEmail,
      bcrypt.hashSync(password, 12),
      String(fullName).trim(),
      requestedRole,
      institutionId || null,
      classYear || null,
      phone || null,
    ]
  );

  logActivity(req, 'register', 'user', row.id, `${requestedRole} self-registered`);
  res.status(201).json({
    success: true,
    message: 'Account created. Your institution will verify you shortly — you can sign in now.',
    user: publicUser(row),
  });
}));

// ─── Login ───
router.post('/login', loginLimiter, ah(async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await one(
    `SELECT u.*, i.name AS institution_name
     FROM users u LEFT JOIN institutions i ON u.institution_id = i.id
     WHERE u.email = $1`,
    [String(email).trim().toLowerCase()]
  );

  // One identical message for "no such user" and "wrong password" — telling them apart
  // turns this endpoint into a way to enumerate who has an account.
  const INVALID = 'Incorrect email or password.';
  if (!user) return res.status(401).json({ error: INVALID });
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: INVALID });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: 'This account has been deactivated. Please contact the district office.' });
  }
  // The role picker is a convenience, not a permission: the real role always comes from the
  // database. We only check the two agree, so a student picking "Administrator" gets a clear
  // error instead of silently landing on the student dashboard.
  if (role && role !== user.role) {
    return res.status(403).json({ error: `This account is not registered as ${role}. Please choose the correct role.` });
  }

  // Prevents session fixation: a pre-login session id must not survive privilege escalation.
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Could not start a session. Please try again.' });

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.institutionId = user.institution_id;

    req.session.save(async (saveErr) => {
      if (saveErr) return res.status(500).json({ error: 'Could not start a session. Please try again.' });
      await run('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
      logActivity(req, 'login', 'user', user.id, user.role);
      res.json({
        success: true,
        user: publicUser(user),
        redirect: HOME_FOR_ROLE[user.role] || '/index.html',
      });
    });
  });
}));

// ─── Logout ───
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// ─── Current session ───
router.get('/me', requireAuth, ah(async (req, res) => {
  const user = await one(
    `SELECT u.*, i.name AS institution_name
     FROM users u LEFT JOIN institutions i ON u.institution_id = i.id
     WHERE u.id = $1`,
    [req.session.userId]
  );
  // The account was deleted or deactivated while the session was still alive.
  if (!user || !user.is_active) {
    return req.session.destroy(() => res.status(401).json({ error: 'Session no longer valid.' }));
  }
  res.json({ user: publicUser(user), redirect: HOME_FOR_ROLE[user.role] });
}));

// ─── Update own profile ───
router.put('/profile', requireAuth, ah(async (req, res) => {
  const { fullName, phone, bio, classYear } = req.body;
  const { row } = await run(
    `UPDATE users SET
       full_name  = COALESCE($1, full_name),
       phone      = COALESCE($2, phone),
       bio        = COALESCE($3, bio),
       class_year = COALESCE($4, class_year),
       updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [fullName || null, phone || null, bio || null, classYear || null, req.session.userId]
  );
  res.json({ success: true, user: publicUser(row) });
}));

// ─── Avatar ───
router.put('/avatar', requireAuth, upload.single('avatar'), ah(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image was uploaded.' });
  const url = publicPath(req.file);
  await run('UPDATE users SET avatar = $1, updated_at = NOW() WHERE id = $2', [url, req.session.userId]);
  res.json({ success: true, avatar: url });
}));

// ─── Change password ───
router.post('/change-password', requireAuth, ah(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  const user = await one('SELECT password_hash FROM users WHERE id = $1', [req.session.userId]);
  if (!bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(401).json({ error: 'Your current password is incorrect.' });
  }

  await run(
    'UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2',
    [bcrypt.hashSync(newPassword, 12), req.session.userId]
  );
  logActivity(req, 'change_password', 'user', req.session.userId);
  res.json({ success: true });
}));

module.exports = { router, HOME_FOR_ROLE, publicUser };
