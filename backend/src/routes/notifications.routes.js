const express = require('express');
const { all, one, run } = require('../config/db');
const { ah, requireAuth, requireRole, logActivity } = require('../middleware/auth');

const router = express.Router();

// The Alerts feed (PDF §5.11). Scoped to req.session.userId, and restricted to
// type='announcement' — Alerts shows ONLY important announcements the admin sent, nothing else.
// Every read is scoped to the session user, never to an id from the client.
router.get('/', requireAuth, ah(async (req, res) => {
  const rows = await all(
    `SELECT * FROM notifications WHERE user_id = $1 AND type = 'announcement'
     ORDER BY created_at DESC LIMIT 50`,
    [req.session.userId]
  );
  const { count } = await one(
    `SELECT COUNT(*)::int AS count FROM notifications
     WHERE user_id = $1 AND type = 'announcement' AND is_read = FALSE`,
    [req.session.userId]
  );
  res.json({ notifications: rows, unreadCount: count });
}));

router.put('/read-all', requireAuth, ah(async (req, res) => {
  await run(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND type = 'announcement'`,
    [req.session.userId]
  );
  res.json({ success: true });
}));

router.put('/:id/read', requireAuth, ah(async (req, res) => {
  // The user_id predicate is the authorisation check — without it, any id in the URL
  // would let one user mark (and thereby confirm the existence of) another's notification.
  const { count } = await run(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
    [req.params.id, req.session.userId]
  );
  if (!count) return res.status(404).json({ error: 'Notification not found.' });
  res.json({ success: true });
}));

/** Broadcast (PDF §5.11) — district announcements pushed to a chosen audience. */
router.post('/broadcast', requireRole('admin'), ah(async (req, res) => {
  const { title, message, audience, institutionId } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required.' });

  const params = [];
  // Admins send announcements, they don't receive them. Everyone else — students, alumni,
  // institutions and counsellors — is a valid recipient, so 'all' reaches all four.
  let sql = `SELECT id FROM users WHERE is_active = TRUE AND role <> 'admin'`;
  if (audience === 'students') sql += ` AND role = 'student'`;
  else if (audience === 'alumni') sql += ` AND role = 'alumni'`;
  else if (audience === 'institutions') sql += ` AND role = 'institution'`;
  else if (audience === 'counsellors') sql += ` AND role = 'counsellor'`;
  // anything else = everyone in the pool above

  if (institutionId) {
    params.push(institutionId);
    sql += ` AND institution_id = $${params.length}`;
  }

  const recipients = await all(sql, params);
  if (!recipients.length) return res.status(400).json({ error: 'No recipients match that audience.' });

  // Record the announcement first (the editable/deletable master), then fan out one linked
  // copy per recipient. The link lets a later edit/delete reach every delivered copy.
  const { row: ann } = await run(
    `INSERT INTO announcements (title, message, audience, institution_id, sent_by, recipient_count)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [title.trim(), message, audience || 'all', institutionId || null, req.session.userId, recipients.length]
  );

  await run(
    `INSERT INTO notifications (user_id, title, message, type, announcement_id)
     SELECT UNNEST($1::int[]), $2, $3, 'announcement', $4`,
    [recipients.map((r) => r.id), title.trim(), message, ann.id]
  );

  logActivity(req, 'broadcast', 'announcement', ann.id, `${recipients.length} recipients`);
  res.status(201).json({ success: true, sent: recipients.length, id: ann.id });
}));

/** Announcements this admin (or any admin) has sent — the admin Notifications page. */
router.get('/announcements', requireRole('admin'), ah(async (req, res) => {
  res.json(await all(
    `SELECT a.*, u.full_name AS sent_by_name, i.name AS institution_name,
            (SELECT COUNT(*)::int FROM notifications n WHERE n.announcement_id = a.id AND n.is_read) AS read_count
     FROM announcements a
     LEFT JOIN users u ON a.sent_by = u.id
     LEFT JOIN institutions i ON a.institution_id = i.id
     ORDER BY a.created_at DESC`
  ));
}));

/** Edit a sent announcement — updates every delivered copy so recipients see the correction. */
router.put('/announcements/:id', requireRole('admin'), ah(async (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required.' });

  const ann = await one('SELECT id FROM announcements WHERE id = $1', [req.params.id]);
  if (!ann) return res.status(404).json({ error: 'Announcement not found.' });

  await run('UPDATE announcements SET title = $1, message = $2 WHERE id = $3', [title.trim(), message, req.params.id]);
  await run(
    'UPDATE notifications SET title = $1, message = $2 WHERE announcement_id = $3',
    [title.trim(), message, req.params.id]
  );
  logActivity(req, 'edit', 'announcement', req.params.id);
  res.json({ success: true });
}));

/** Delete a sent announcement — the linked copies cascade away (schema ON DELETE CASCADE). */
router.delete('/announcements/:id', requireRole('admin'), ah(async (req, res) => {
  const { count } = await run('DELETE FROM announcements WHERE id = $1', [req.params.id]);
  if (!count) return res.status(404).json({ error: 'Announcement not found.' });
  logActivity(req, 'delete', 'announcement', req.params.id);
  res.json({ success: true });
}));

module.exports = router;
