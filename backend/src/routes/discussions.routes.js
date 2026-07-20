const express = require('express');
const { all, one, run } = require('../config/db');
const { ah, requireAuth, requireRole, logActivity } = require('../middleware/auth');

const router = express.Router();

// PDF §5.3 — a structured Q&A board. Readable by anyone; posting requires an account
// so every message is attributable (this is a school platform, not an anonymous forum).
router.get('/', ah(async (req, res) => {
  const params = [];
  let sql = `SELECT d.*, u.full_name AS author_name, u.role AS author_role, u.avatar AS author_avatar,
                    (SELECT COUNT(*)::int FROM discussion_replies WHERE discussion_id = d.id) AS reply_count
             FROM discussions d JOIN users u ON d.author_id = u.id`;
  if (req.query.category) {
    params.push(req.query.category);
    sql += ` WHERE d.category = $1`;
  }
  sql += ' ORDER BY d.created_at DESC LIMIT 100';
  res.json(await all(sql, params));
}));

router.get('/:id', ah(async (req, res) => {
  const discussion = await one(
    `SELECT d.*, u.full_name AS author_name, u.role AS author_role, u.avatar AS author_avatar
     FROM discussions d JOIN users u ON d.author_id = u.id WHERE d.id = $1`,
    [req.params.id]
  );
  if (!discussion) return res.status(404).json({ error: 'Discussion not found.' });

  const replies = await all(
    `SELECT r.*, u.full_name AS author_name, u.role AS author_role, u.avatar AS author_avatar
     FROM discussion_replies r JOIN users u ON r.author_id = u.id
     WHERE r.discussion_id = $1 ORDER BY r.created_at ASC`,
    [req.params.id]
  );
  res.json({ ...discussion, replies });
}));

router.post('/', requireAuth, ah(async (req, res) => {
  const { title, body, category } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and message are required.' });
  const { row } = await run(
    `INSERT INTO discussions (title, body, category, author_id) VALUES ($1,$2,$3,$4) RETURNING *`,
    [title.trim(), body, category || 'general', req.session.userId]
  );
  logActivity(req, 'create', 'discussion', row.id, title);
  res.status(201).json(row);
}));

router.post('/:id/replies', requireAuth, ah(async (req, res) => {
  const { body } = req.body;
  if (!body || !String(body).trim()) return res.status(400).json({ error: 'Reply cannot be empty.' });

  const discussion = await one('SELECT * FROM discussions WHERE id = $1', [req.params.id]);
  if (!discussion) return res.status(404).json({ error: 'Discussion not found.' });
  if (discussion.is_locked) return res.status(403).json({ error: 'This discussion has been closed.' });

  const { row } = await run(
    'INSERT INTO discussion_replies (discussion_id, author_id, body) VALUES ($1,$2,$3) RETURNING *',
    [req.params.id, req.session.userId, body]
  );

  // No Alerts notification — Alerts is admin announcements only. The reply is visible when
  // the author reopens the discussion thread.
  res.status(201).json(row);
}));

// Moderation: authors may remove their own posts; staff may remove anything.
router.delete('/:id', requireAuth, ah(async (req, res) => {
  const discussion = await one('SELECT * FROM discussions WHERE id = $1', [req.params.id]);
  if (!discussion) return res.status(404).json({ error: 'Discussion not found.' });
  const isStaff = ['admin', 'counsellor'].includes(req.session.role);
  if (discussion.author_id !== req.session.userId && !isStaff) {
    return res.status(403).json({ error: 'You can only delete your own posts.' });
  }
  await run('DELETE FROM discussions WHERE id = $1', [req.params.id]);
  res.json({ success: true });
}));

router.put('/:id/lock', requireRole('admin', 'counsellor'), ah(async (req, res) => {
  const { row } = await run(
    'UPDATE discussions SET is_locked = NOT is_locked WHERE id = $1 RETURNING *',
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'Discussion not found.' });
  res.json(row);
}));

module.exports = router;
