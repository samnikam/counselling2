const express = require('express');
const bcrypt = require('bcryptjs');
const { all, one, run } = require('../config/db');
const { ah, requireAuth, requireRole, logActivity } = require('../middleware/auth');

const router = express.Router();

// Public: powers the "select your school/college" dropdown on the register + login screens,
// so it must stay reachable without a session.
router.get('/', ah(async (req, res) => {
  const rows = await all(
    `SELECT id, name, type, zone FROM institutions WHERE is_active = TRUE ORDER BY type, name`
  );
  res.json(rows);
}));

// Admin: full list with live student counts (PDF §5.12 "institution-wise data").
router.get('/admin/overview', requireRole('admin'), ah(async (req, res) => {
  const rows = await all(
    `SELECT i.*,
            COUNT(DISTINCT s.id) FILTER (WHERE s.role = 'student')     AS student_count,
            COUNT(DISTINCT a.id) FILTER (WHERE a.role = 'institution') AS account_count
     FROM institutions i
     LEFT JOIN users s ON s.institution_id = i.id
     LEFT JOIN users a ON a.institution_id = i.id
     GROUP BY i.id
     ORDER BY i.type, i.name`
  );
  res.json(rows);
}));

// The signed-in institution's own record.
router.get('/me', requireRole('institution'), ah(async (req, res) => {
  if (!req.session.institutionId) {
    return res.status(400).json({ error: 'This account is not linked to an institution yet.' });
  }
  res.json(await one('SELECT * FROM institutions WHERE id = $1', [req.session.institutionId]));
}));

router.post('/', requireRole('admin'), ah(async (req, res) => {
  const { name, type, zone, address, contactEmail, contactPhone } = req.body;
  if (!name || !['hss', 'college'].includes(type)) {
    return res.status(400).json({ error: 'Name and a valid type (hss/college) are required.' });
  }
  const existing = await one('SELECT id FROM institutions WHERE LOWER(name) = LOWER($1)', [name]);
  if (existing) return res.status(409).json({ error: 'An institution with this name already exists.' });

  const { row } = await run(
    `INSERT INTO institutions (name, type, zone, address, contact_email, contact_phone)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name.trim(), type, zone || null, address || null, contactEmail || null, contactPhone || null]
  );
  logActivity(req, 'create', 'institution', row.id, name);
  res.status(201).json(row);
}));

router.put('/:id', requireRole('admin', 'institution'), ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  // An institution account may only ever edit itself — without this it could rewrite any
  // of the other 87 institutions by changing the id in the URL.
  if (req.session.role === 'institution' && req.session.institutionId !== id) {
    return res.status(403).json({ error: 'You can only edit your own institution.' });
  }
  const { zone, address, contactEmail, contactPhone } = req.body;
  // `name` and `type` are deliberately admin-only: they are the district's official record.
  const name = req.session.role === 'admin' ? req.body.name : undefined;

  const { row } = await run(
    `UPDATE institutions SET
       name = COALESCE($1, name), zone = COALESCE($2, zone), address = COALESCE($3, address),
       contact_email = COALESCE($4, contact_email), contact_phone = COALESCE($5, contact_phone)
     WHERE id = $6 RETURNING *`,
    [name ?? null, zone ?? null, address ?? null, contactEmail ?? null, contactPhone ?? null, id]
  );
  if (!row) return res.status(404).json({ error: 'Institution not found.' });
  res.json(row);
}));

router.put('/:id/toggle', requireRole('admin'), ah(async (req, res) => {
  const { row } = await run(
    'UPDATE institutions SET is_active = NOT is_active WHERE id = $1 RETURNING *',
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'Institution not found.' });
  logActivity(req, 'toggle', 'institution', row.id, row.is_active ? 'activated' : 'deactivated');
  res.json(row);
}));

// Creates the login account a school/college uses (PDF §5.9). Admin-only.
router.post('/:id/account', requireRole('admin'), ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { email, password, fullName } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const institution = await one('SELECT * FROM institutions WHERE id = $1', [id]);
  if (!institution) return res.status(404).json({ error: 'Institution not found.' });

  const normalised = String(email).trim().toLowerCase();
  if (await one('SELECT id FROM users WHERE email = $1', [normalised])) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const { row } = await run(
    `INSERT INTO users (email, password_hash, full_name, role, institution_id, is_verified, must_change_password)
     VALUES ($1,$2,$3,'institution',$4,TRUE,TRUE) RETURNING id, email, full_name, role`,
    [normalised, bcrypt.hashSync(password, 12), fullName || institution.name, id]
  );
  logActivity(req, 'create', 'institution_account', row.id, institution.name);
  res.status(201).json(row);
}));

// Students belonging to the signed-in institution (PDF §5.9 "manage student-related information").
router.get('/me/students', requireRole('institution'), ah(async (req, res) => {
  const rows = await all(
    `SELECT id, full_name, email, class_year, phone, is_verified, is_active, created_at
     FROM users WHERE role = 'student' AND institution_id = $1 ORDER BY full_name`,
    [req.session.institutionId]
  );
  res.json(rows);
}));

module.exports = router;
