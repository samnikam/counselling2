const express = require('express');
const bcrypt = require('bcryptjs');
const { all, one, run } = require('../config/db');
const { ah, requireRole, logActivity } = require('../middleware/auth');

const router = express.Router();

// Every route here is admin-only (PDF §5.12).
router.use(requireRole('admin'));

// ─── Dashboard stats ───
router.get('/stats', ah(async (req, res) => {
  const [students, alumni, counsellors, institutions, events, counselling, pendingCounselling, discussions] =
    await Promise.all([
      one(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'student'`),
      one(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'alumni'`),
      one(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'counsellor'`),
      one(`SELECT COUNT(*)::int AS n FROM institutions WHERE is_active`),
      one(`SELECT COUNT(*)::int AS n FROM events`),
      one(`SELECT COUNT(*)::int AS n FROM counselling_requests`),
      one(`SELECT COUNT(*)::int AS n FROM counselling_requests WHERE status = 'pending'`),
      one(`SELECT COUNT(*)::int AS n FROM discussions`),
    ]);

  const eventParticipation = await one(
    `SELECT COUNT(*)::int AS n FROM event_registrations`
  );

  res.json({
    students: students.n,
    alumni: alumni.n,
    counsellors: counsellors.n,
    institutions: institutions.n,
    events: events.n,
    eventParticipation: eventParticipation.n,
    counsellingTotal: counselling.n,
    counsellingPending: pendingCounselling.n,
    discussions: discussions.n,
  });
}));

// Counselling requests grouped by type — feeds a chart in the admin dashboard.
router.get('/stats/counselling-by-type', ah(async (req, res) => {
  res.json(await all(
    `SELECT request_type, COUNT(*)::int AS count FROM counselling_requests
     GROUP BY request_type ORDER BY count DESC`
  ));
}));

// ─── User management ───
router.get('/users', ah(async (req, res) => {
  const params = [];
  let sql = `SELECT u.id, u.email, u.full_name, u.role, u.class_year, u.phone,
                    u.is_verified, u.is_active, u.created_at, u.last_login_at,
                    i.name AS institution_name
             FROM users u LEFT JOIN institutions i ON u.institution_id = i.id WHERE 1 = 1`;
  if (req.query.role) {
    params.push(req.query.role);
    sql += ` AND u.role = $${params.length}`;
  }
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    sql += ` AND (u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
  }
  sql += ' ORDER BY u.created_at DESC LIMIT 500';
  res.json(await all(sql, params));
}));

/** Create a staff account (counsellor or another admin). Students/alumni self-register instead. */
router.post('/users', ah(async (req, res) => {
  const { email, password, fullName, role, bio } = req.body;
  if (!email || !password || !fullName) return res.status(400).json({ error: 'Name, email and password are required.' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!['counsellor', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'This endpoint creates counsellor or admin accounts only.' });
  }

  const normalised = String(email).trim().toLowerCase();
  if (await one('SELECT id FROM users WHERE email = $1', [normalised])) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const { row } = await run(
    `INSERT INTO users (email, password_hash, full_name, role, bio, is_verified, must_change_password)
     VALUES ($1,$2,$3,$4,$5,TRUE,TRUE) RETURNING id, email, full_name, role`,
    [normalised, bcrypt.hashSync(password, 12), fullName.trim(), role, bio || null]
  );
  logActivity(req, 'create', 'user', row.id, role);
  res.status(201).json(row);
}));

router.put('/users/:id/toggle', ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  // An admin must not lock themselves out of the only admin account mid-session.
  if (id === req.session.userId) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  const { row } = await run('UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active', [id]);
  if (!row) return res.status(404).json({ error: 'User not found.' });
  logActivity(req, 'toggle', 'user', id, row.is_active ? 'activated' : 'deactivated');
  res.json(row);
}));

router.put('/users/:id/verify', ah(async (req, res) => {
  const { row } = await run('UPDATE users SET is_verified = TRUE WHERE id = $1 RETURNING id, is_verified', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'User not found.' });
  res.json(row);
}));

router.put('/users/:id/reset-password', ah(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  const { row } = await run(
    'UPDATE users SET password_hash = $1, must_change_password = TRUE WHERE id = $2 RETURNING id',
    [bcrypt.hashSync(newPassword, 12), req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'User not found.' });
  logActivity(req, 'reset_password', 'user', req.params.id);
  res.json({ success: true });
}));

router.delete('/users/:id', ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.session.userId) return res.status(400).json({ error: 'You cannot delete your own account.' });
  const { count } = await run('DELETE FROM users WHERE id = $1', [id]);
  if (!count) return res.status(404).json({ error: 'User not found.' });
  logActivity(req, 'delete', 'user', id);
  res.json({ success: true });
}));

// ─── Activity log & reports (PDF §5.12) ───
router.get('/activity', ah(async (req, res) => {
  res.json(await all(
    `SELECT a.*, u.full_name AS user_name, u.role AS user_role FROM activity_log a
     LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 200`
  ));
}));

// Institution-wise participation report.
router.get('/reports/institutions', ah(async (req, res) => {
  res.json(await all(
    `SELECT i.id, i.name, i.type,
            COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student') AS students,
            COUNT(DISTINCT r.id) AS event_registrations,
            COUNT(DISTINCT cr.id) AS counselling_requests
     FROM institutions i
     LEFT JOIN users u ON u.institution_id = i.id
     LEFT JOIN event_registrations r ON r.user_id = u.id
     LEFT JOIN counselling_requests cr ON cr.student_id = u.id
     GROUP BY i.id ORDER BY students DESC NULLS LAST`
  ));
}));

// ─── Settings ───
router.get('/settings', ah(async (req, res) => {
  const rows = await all('SELECT key, value FROM portal_settings');
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}));

router.put('/settings', ah(async (req, res) => {
  const entries = Object.entries(req.body || {});
  for (const [key, value] of entries) {
    await run(
      `INSERT INTO portal_settings (key, value, updated_at) VALUES ($1,$2,NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, String(value)]
    );
  }
  res.json({ success: true });
}));

module.exports = router;
