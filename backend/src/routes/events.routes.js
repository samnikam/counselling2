const express = require('express');
const { all, one, run, tx } = require('../config/db');
const { ah, requireAuth, requireRole, logActivity } = require('../middleware/auth');
const { upload, publicPath } = require('../middleware/upload');

const router = express.Router();

// Public list (PDF §5.6). Same visibility rule as notices: district-level events are
// visible to all; an institution's events are visible to its own students.
router.get('/', ah(async (req, res) => {
  const isStaff = ['admin', 'counsellor'].includes(req.session.role);
  const params = [];
  let sql = `SELECT e.*, i.name AS institution_name,
                    COUNT(r.id)::int AS registered_count
             FROM events e
             LEFT JOIN institutions i ON e.institution_id = i.id
             LEFT JOIN event_registrations r ON r.event_id = e.id
             WHERE e.is_published = TRUE`;
  if (!isStaff) {
    params.push(req.session.institutionId || null);
    sql += ` AND (e.institution_id IS NULL OR e.institution_id = $1)`;
  }
  sql += ` GROUP BY e.id, i.name ORDER BY e.starts_at ASC`;
  res.json(await all(sql, params));
}));

// Must be declared before '/:id' — Express matches in order, so '/my-registrations'
// would otherwise be captured as an id and fail to parse.
router.get('/my-registrations', requireAuth, ah(async (req, res) => {
  res.json(await all(
    `SELECT e.*, r.attended, r.registered_at
     FROM event_registrations r JOIN events e ON r.event_id = e.id
     WHERE r.user_id = $1 ORDER BY e.starts_at ASC`,
    [req.session.userId]
  ));
}));

router.get('/:id', ah(async (req, res) => {
  const event = await one(
    `SELECT e.*, i.name AS institution_name,
            (SELECT COUNT(*)::int FROM event_registrations WHERE event_id = e.id) AS registered_count
     FROM events e LEFT JOIN institutions i ON e.institution_id = i.id WHERE e.id = $1`,
    [req.params.id]
  );
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  res.json(event);
}));

router.post('/', requireRole('admin', 'counsellor', 'institution'), upload.single('banner'), ah(async (req, res) => {
  const { title, description, category, venue, startsAt, registrationDeadline, capacity } = req.body;
  if (!title || !startsAt) return res.status(400).json({ error: 'Title and start date are required.' });
  if (Number.isNaN(Date.parse(startsAt))) return res.status(400).json({ error: 'Start date is not a valid date.' });

  const institutionId =
    req.session.role === 'institution' ? req.session.institutionId : req.body.institutionId || null;

  const { row } = await run(
    `INSERT INTO events (title, description, category, venue, starts_at, registration_deadline,
                         capacity, institution_id, created_by, banner)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      title.trim(), description || null, category || 'event', venue || null, startsAt,
      registrationDeadline || null, capacity ? parseInt(capacity, 10) : null,
      institutionId, req.session.userId, req.file ? publicPath(req.file) : null,
    ]
  );
  logActivity(req, 'create', 'event', row.id, title);
  res.status(201).json(row);
}));

router.put('/:id', requireRole('admin', 'counsellor', 'institution'), ah(async (req, res) => {
  const event = await one('SELECT * FROM events WHERE id = $1', [req.params.id]);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  if (req.session.role === 'institution' && event.institution_id !== req.session.institutionId) {
    return res.status(403).json({ error: 'You can only edit your own events.' });
  }
  const { title, description, venue, startsAt, capacity, isPublished } = req.body;
  const { row } = await run(
    `UPDATE events SET title = COALESCE($1,title), description = COALESCE($2,description),
            venue = COALESCE($3,venue), starts_at = COALESCE($4,starts_at),
            capacity = COALESCE($5,capacity), is_published = COALESCE($6,is_published)
     WHERE id = $7 RETURNING *`,
    [title || null, description || null, venue || null, startsAt || null,
     capacity ? parseInt(capacity, 10) : null,
     typeof isPublished === 'boolean' ? isPublished : null, req.params.id]
  );
  res.json(row);
}));

router.delete('/:id', requireRole('admin', 'counsellor', 'institution'), ah(async (req, res) => {
  const event = await one('SELECT * FROM events WHERE id = $1', [req.params.id]);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  if (req.session.role === 'institution' && event.institution_id !== req.session.institutionId) {
    return res.status(403).json({ error: 'You can only delete your own events.' });
  }
  await run('DELETE FROM events WHERE id = $1', [req.params.id]);
  res.json({ success: true });
}));

// ─── Registration (PDF §5.6 "students can register online") ───
router.post('/:id/register', requireAuth, ah(async (req, res) => {
  const eventId = parseInt(req.params.id, 10);

  try {
    const result = await tx(async (client) => {
      // FOR UPDATE serialises concurrent registrations for the same event. Without it, two
      // students on the last seat both read capacity-1 and both insert — overbooking the event.
      const { rows: [event] } = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
      if (!event) return { status: 404, body: { error: 'Event not found.' } };
      if (!event.is_published) return { status: 403, body: { error: 'This event is not open for registration.' } };

      if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
        return { status: 400, body: { error: 'Registration for this event has closed.' } };
      }
      if (event.institution_id && event.institution_id !== req.session.institutionId) {
        return { status: 403, body: { error: 'This event is only open to its own institution.' } };
      }

      if (event.capacity !== null) {
        const { rows: [{ count }] } = await client.query(
          'SELECT COUNT(*)::int AS count FROM event_registrations WHERE event_id = $1', [eventId]
        );
        if (count >= event.capacity) return { status: 409, body: { error: 'This event is full.' } };
      }

      await client.query(
        'INSERT INTO event_registrations (event_id, user_id) VALUES ($1,$2)',
        [eventId, req.session.userId]
      );
      return { status: 201, body: { success: true } };
    });

    if (result.status === 201) logActivity(req, 'register', 'event', eventId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    // The UNIQUE(event_id,user_id) constraint firing means they already registered —
    // a duplicate click, not a server fault.
    if (err.code === '23505') return res.status(409).json({ error: 'You have already registered for this event.' });
    throw err;
  }
}));

router.delete('/:id/register', requireAuth, ah(async (req, res) => {
  const { count } = await run(
    'DELETE FROM event_registrations WHERE event_id = $1 AND user_id = $2',
    [req.params.id, req.session.userId]
  );
  if (!count) return res.status(404).json({ error: 'You are not registered for this event.' });
  res.json({ success: true });
}));

// Attendance sheet — institution/admin only.
router.get('/:id/registrations', requireRole('admin', 'counsellor', 'institution'), ah(async (req, res) => {
  const event = await one('SELECT * FROM events WHERE id = $1', [req.params.id]);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  // An institution may only read the roster of an event it owns — a district-wide event's
  // roster spans every school and is not theirs to see.
  if (req.session.role === 'institution' && event.institution_id !== req.session.institutionId) {
    return res.status(403).json({ error: 'You can only view registrations for your own events.' });
  }

  res.json(await all(
    `SELECT r.id, r.attended, r.registered_at, u.id AS user_id, u.full_name, u.email,
            u.class_year, i.name AS institution_name
     FROM event_registrations r
     JOIN users u ON r.user_id = u.id
     LEFT JOIN institutions i ON u.institution_id = i.id
     WHERE r.event_id = $1 ORDER BY u.full_name`,
    [req.params.id]
  ));
}));

router.put('/:id/registrations/:userId/attend', requireRole('admin', 'institution'), ah(async (req, res) => {
  const { row } = await run(
    `UPDATE event_registrations SET attended = NOT attended
     WHERE event_id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.params.userId]
  );
  if (!row) return res.status(404).json({ error: 'Registration not found.' });
  res.json(row);
}));

module.exports = router;
