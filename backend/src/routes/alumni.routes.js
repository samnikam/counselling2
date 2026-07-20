const express = require('express');
const { all, one, run } = require('../config/db');
const { ah, requireAuth, requireRole, logActivity } = require('../middleware/auth');

const router = express.Router();

// PDF §5.10 — the mentor directory students browse. Approved profiles only: an unvetted
// adult must not be listed to students as a mentor.
router.get('/', ah(async (req, res) => {
  const isStaff = ['admin', 'counsellor'].includes(req.session.role);
  const params = [];
  let sql = `SELECT a.*, u.full_name, u.avatar, u.bio, u.email, i.name AS institution_name
             FROM alumni_profiles a
             JOIN users u ON a.user_id = u.id
             LEFT JOIN institutions i ON a.institution_id = i.id
             WHERE u.is_active = TRUE`;

  if (req.query.pending === '1' && isStaff) sql += ' AND a.is_approved = FALSE';
  else if (!isStaff) sql += ' AND a.is_approved = TRUE';

  if (req.query.mentorsOnly === '1') sql += ' AND a.open_to_mentor = TRUE';
  sql += ' ORDER BY a.graduation_year DESC NULLS LAST, u.full_name';

  const rows = await all(sql, params);
  // Contact details are only for staff — the public directory shows expertise, not an inbox.
  if (!isStaff) rows.forEach((r) => { delete r.email; });
  res.json(rows);
}));

/** The signed-in alumnus's own profile (may not exist yet). */
router.get('/me', requireRole('alumni'), ah(async (req, res) => {
  const profile = await one(
    `SELECT a.*, i.name AS institution_name FROM alumni_profiles a
     LEFT JOIN institutions i ON a.institution_id = i.id WHERE a.user_id = $1`,
    [req.session.userId]
  );
  res.json(profile || null);
}));

/** Create-or-update — the alumni dashboard has one profile form, not separate add/edit flows. */
router.put('/me', requireRole('alumni'), ah(async (req, res) => {
  const { institutionId, graduationYear, occupation, organisation, expertise, linkedinUrl, openToMentor } = req.body;

  const year = graduationYear ? parseInt(graduationYear, 10) : null;
  if (year && (year < 1950 || year > new Date().getFullYear())) {
    return res.status(400).json({ error: 'Please enter a valid graduation year.' });
  }

  // Editing a profile sends it back for re-approval only if it was never approved;
  // an approved mentor updating their job title should not vanish from the directory.
  const { row } = await run(
    `INSERT INTO alumni_profiles (user_id, institution_id, graduation_year, occupation,
                                  organisation, expertise, linkedin_url, open_to_mentor)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (user_id) DO UPDATE SET
       institution_id = EXCLUDED.institution_id,
       graduation_year = EXCLUDED.graduation_year,
       occupation = EXCLUDED.occupation,
       organisation = EXCLUDED.organisation,
       expertise = EXCLUDED.expertise,
       linkedin_url = EXCLUDED.linkedin_url,
       open_to_mentor = EXCLUDED.open_to_mentor
     RETURNING *`,
    [req.session.userId, institutionId || null, year, occupation || null,
     organisation || null, expertise || null, linkedinUrl || null,
     openToMentor === false ? false : true]
  );

  // Keep users.institution_id in step so the alumnus shows under the right school elsewhere.
  if (institutionId) {
    await run('UPDATE users SET institution_id = $1 WHERE id = $2', [institutionId, req.session.userId]);
  }
  res.json(row);
}));

router.put('/:id/approve', requireRole('admin', 'counsellor'), ah(async (req, res) => {
  const { row } = await run(
    'UPDATE alumni_profiles SET is_approved = TRUE WHERE id = $1 RETURNING *',
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'Profile not found.' });
  // No Alerts notification — Alerts is admin announcements only. The alumnus sees the
  // "Approved" status on their own profile page.
  logActivity(req, 'approve', 'alumni_profile', row.id);
  res.json(row);
}));

module.exports = router;
