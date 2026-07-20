const express = require('express');
const { all, one, run } = require('../config/db');
const { ah, requireAuth, requireRole, logActivity } = require('../middleware/auth');

const router = express.Router();

const TYPE_LABELS = {
  stress: 'Stress Management',
  mental_health: 'Psychological Counselling',
  career: 'Career & Aptitude Guidance',
  academic: 'Educational Guidance',
  personal: 'Family / Personal',
  other: 'Other',
};

// Columns a student is allowed to see about their OWN request. session_notes is deliberately
// absent: clinical notes are written for the Centre, not for the student (PDF §5.14).
const STUDENT_FIELDS = `cr.id, cr.request_type, cr.description, cr.preferred_date, cr.preferred_time,
                        cr.preferred_language, cr.status, cr.created_at, cr.updated_at`;

// Public counsellor directory for the booking page — name and bio only, nothing else.
router.get('/counsellors', ah(async (req, res) => {
  res.json(await all(
    `SELECT id, full_name, bio, avatar FROM users
     WHERE role = 'counsellor' AND is_active = TRUE ORDER BY full_name`
  ));
}));

/**
 * Booking. Deliberately unauthenticated: the public site lets a student in distress ask for
 * help without first creating an account (PDF §5.7). A signed-in user gets the request tied
 * to their account; a guest must at least leave a name so the Centre can follow up.
 */
router.post('/', ah(async (req, res) => {
  const { requestType, description, preferredDate, preferredTime, preferredLanguage, fullName, phone } = req.body;

  if (!TYPE_LABELS[requestType]) {
    return res.status(400).json({ error: 'Please choose a valid type of support.' });
  }
  const studentId = req.session.userId || null;
  if (!studentId && !String(fullName || '').trim()) {
    return res.status(400).json({ error: 'Please tell us your name so we can contact you.' });
  }

  // A signed-in student's identity always comes from their account, never from the submitted
  // name — so a request can't be filed under one student while naming another. The phone is
  // the one contact detail they may legitimately supply here, so keep it on their profile
  // (only filling a blank; never silently overwriting a number they already saved).
  if (studentId && phone) {
    await run(
      `UPDATE users SET phone = COALESCE(NULLIF(phone, ''), $1), updated_at = NOW() WHERE id = $2`,
      [String(phone).trim(), studentId]
    );
  }

  // counsellor_id is never accepted here — assignment is the Centre's decision, made after triage.
  const { row } = await run(
    `INSERT INTO counselling_requests
       (student_id, guest_name, guest_phone, request_type, description,
        preferred_date, preferred_time, preferred_language)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, status, created_at`,
    [
      studentId,
      studentId ? null : String(fullName).trim(),
      studentId ? null : phone || null,
      requestType,
      description || null,
      preferredDate || null,
      preferredTime || null,
      preferredLanguage || null,
    ]
  );

  // No Alerts notification is created. Alerts is reserved for admin announcements only;
  // counsellors see every incoming request in their Requests tab (and it lands there live).
  logActivity(req, 'create', 'counselling_request', row.id, requestType);
  res.status(201).json({ success: true, request: row });
}));

/**
 * List. Staff see every request in full; a student sees only their own, without notes.
 * This single branch is the main confidentiality boundary in the portal.
 */
router.get('/', requireAuth, ah(async (req, res) => {
  const isStaff = ['admin', 'counsellor'].includes(req.session.role);

  if (!isStaff) {
    return res.json(await all(
      `SELECT ${STUDENT_FIELDS}, c.full_name AS counsellor_name
       FROM counselling_requests cr
       LEFT JOIN users c ON cr.counsellor_id = c.id
       WHERE cr.student_id = $1 ORDER BY cr.created_at DESC`,
      [req.session.userId]
    ));
  }

  const params = [];
  // LEFT JOIN on the student: guest requests have no student_id and must still appear.
  let sql = `SELECT cr.*, u.full_name AS student_name, u.email AS student_email, u.phone AS student_phone,
                    c.full_name AS counsellor_name, i.name AS institution_name
             FROM counselling_requests cr
             LEFT JOIN users u ON cr.student_id = u.id
             LEFT JOIN users c ON cr.counsellor_id = c.id
             LEFT JOIN institutions i ON u.institution_id = i.id
             WHERE 1 = 1`;

  if (req.query.mine === '1' && req.session.role === 'counsellor') {
    params.push(req.session.userId);
    sql += ` AND cr.counsellor_id = $${params.length}`;
  }
  if (req.query.status) {
    params.push(req.query.status);
    sql += ` AND cr.status = $${params.length}`;
  }
  if (req.query.type) {
    params.push(req.query.type);
    sql += ` AND cr.request_type = $${params.length}`;
  }
  sql += ' ORDER BY cr.created_at DESC';

  logActivity(req, 'view', 'counselling_list', null, req.query.status || 'all');
  res.json(await all(sql, params));
}));

/** Staff triage: assign, schedule, add notes. */
router.put('/:id', requireRole('admin', 'counsellor'), ah(async (req, res) => {
  const before = await one('SELECT * FROM counselling_requests WHERE id = $1', [req.params.id]);
  if (!before) return res.status(404).json({ error: 'Request not found.' });

  const { status, sessionNotes, preferredDate, preferredTime } = req.body;
  // Only an admin may (re)assign. A counsellor can work a request but cannot hand it to
  // someone else or claim another counsellor's case.
  const counsellorId = req.session.role === 'admin' ? req.body.counsellorId : undefined;

  if (status && !['pending', 'assigned', 'scheduled', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  const { row } = await run(
    `UPDATE counselling_requests SET
       status = COALESCE($1, status),
       counsellor_id = COALESCE($2, counsellor_id),
       session_notes = COALESCE($3, session_notes),
       preferred_date = COALESCE($4, preferred_date),
       preferred_time = COALESCE($5, preferred_time),
       updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    // `?? null` matters: pg rejects `undefined` outright, and a caller omitting a field
    // entirely would otherwise 500 with an opaque bind error.
    [status ?? null, counsellorId ?? null, sessionNotes ?? null,
     preferredDate ?? null, preferredTime ?? null, req.params.id]
  );

  // No Alerts notification is created for status/assignment changes. Alerts is admin
  // announcements only; the student sees the current status and assigned counsellor directly
  // on their own request card in the Counselling tab.
  logActivity(req, 'update', 'counselling_request', row.id, status || 'notes');
  res.json(row);
}));

/** A student may cancel their own pending request — and nothing else. */
router.put('/:id/cancel', requireAuth, ah(async (req, res) => {
  const request = await one('SELECT * FROM counselling_requests WHERE id = $1', [req.params.id]);
  if (!request) return res.status(404).json({ error: 'Request not found.' });
  if (request.student_id !== req.session.userId) {
    return res.status(403).json({ error: 'This is not your request.' });
  }
  if (!['pending', 'assigned'].includes(request.status)) {
    return res.status(400).json({ error: 'Only a pending request can be cancelled.' });
  }
  await run(`UPDATE counselling_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
}));

module.exports = router;
