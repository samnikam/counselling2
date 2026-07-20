const express = require('express');
const bcrypt = require('bcryptjs');
const { one, run } = require('../config/db');
const { ah, requireRole, logActivity } = require('../middleware/auth');

const router = express.Router();

// PDF §5.9 — a school/college manages its own students. Every route is institution-only and
// hard-scoped to req.session.institutionId, so one school can never touch another's roster.
router.use(requireRole('institution'));

function ensureOwnInstitution(req, res, next) {
  if (!req.session.institutionId) {
    return res.status(400).json({ error: 'This account is not linked to an institution.' });
  }
  next();
}
router.use(ensureOwnInstitution);

/** Create a student account under this institution. */
router.post('/', ah(async (req, res) => {
  const { email, password, fullName, classYear, phone } = req.body;
  if (!email || !password || !fullName) return res.status(400).json({ error: 'Name, email and password are required.' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const normalised = String(email).trim().toLowerCase();
  if (await one('SELECT id FROM users WHERE email = $1', [normalised])) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // Institution-created students are verified on creation — the school is vouching for them.
  const { row } = await run(
    `INSERT INTO users (email, password_hash, full_name, role, institution_id, class_year, phone,
                        is_verified, must_change_password)
     VALUES ($1,$2,$3,'student',$4,$5,$6,TRUE,TRUE)
     RETURNING id, email, full_name, class_year, phone, is_verified, is_active`,
    [normalised, bcrypt.hashSync(password, 12), fullName.trim(), req.session.institutionId,
     classYear || null, phone || null]
  );
  logActivity(req, 'create', 'student', row.id, fullName);
  res.status(201).json(row);
}));

/** Guard: the target student must belong to this institution. */
async function ownStudent(req, res, next) {
  const student = await one(
    `SELECT * FROM users WHERE id = $1 AND role = 'student' AND institution_id = $2`,
    [req.params.id, req.session.institutionId]
  );
  if (!student) return res.status(404).json({ error: 'Student not found in your institution.' });
  req.targetStudent = student;
  next();
}

router.put('/:id', ah(ownStudent), ah(async (req, res) => {
  const { fullName, classYear, phone } = req.body;
  const { row } = await run(
    `UPDATE users SET full_name = COALESCE($1,full_name), class_year = COALESCE($2,class_year),
            phone = COALESCE($3,phone), updated_at = NOW()
     WHERE id = $4 RETURNING id, email, full_name, class_year, phone, is_verified, is_active`,
    [fullName || null, classYear || null, phone || null, req.params.id]
  );
  res.json(row);
}));

router.put('/:id/verify', ah(ownStudent), ah(async (req, res) => {
  const { row } = await run('UPDATE users SET is_verified = TRUE WHERE id = $1 RETURNING id, is_verified', [req.params.id]);
  res.json(row);
}));

router.put('/:id/reset-password', ah(ownStudent), ah(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  await run('UPDATE users SET password_hash = $1, must_change_password = TRUE WHERE id = $2',
    [bcrypt.hashSync(newPassword, 12), req.params.id]);
  res.json({ success: true });
}));

router.delete('/:id', ah(ownStudent), ah(async (req, res) => {
  await run('DELETE FROM users WHERE id = $1', [req.params.id]);
  logActivity(req, 'delete', 'student', req.params.id);
  res.json({ success: true });
}));

module.exports = router;
