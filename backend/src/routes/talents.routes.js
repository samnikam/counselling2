const express = require('express');
const { all, one, run } = require('../config/db');
const { ah, requireAuth, requireRole, logActivity } = require('../middleware/auth');
const { upload, publicPath } = require('../middleware/upload');

const router = express.Router();

// PDF §5.5. Approved entries are public (recognition is the point); pending ones are staff-only.
router.get('/', ah(async (req, res) => {
  const isStaff = ['admin', 'counsellor'].includes(req.session.role);
  const viewerId = req.session.userId || null;
  const params = [viewerId];

  let sql = `SELECT t.*, u.full_name AS student_name, u.avatar AS student_avatar,
                    i.name AS institution_name,
                    (SELECT COUNT(*)::int FROM talent_likes WHERE talent_id = t.id) AS like_count,
                    EXISTS (SELECT 1 FROM talent_likes WHERE talent_id = t.id AND user_id = $1) AS liked_by_me
             FROM talents t
             JOIN users u ON t.student_id = u.id
             LEFT JOIN institutions i ON u.institution_id = i.id
             WHERE 1 = 1`;

  const mine = req.query.mine === '1' && viewerId;
  if (mine) {
    // Your own entries: no approval filter, so you can watch your submission move
    // through moderation instead of it vanishing until approved.
    params.push(viewerId);
    sql += ` AND t.student_id = $${params.length}`;
  } else if (req.query.pending === '1' && isStaff) {
    sql += ' AND t.is_approved = FALSE';   // moderation queue
  } else if (!isStaff) {
    sql += ' AND t.is_approved = TRUE';    // public showcase
  }

  sql += ' ORDER BY t.created_at DESC LIMIT 200';
  res.json(await all(sql, params));
}));

router.post('/', requireAuth, upload.single('media'), ah(async (req, res) => {
  const { title, category, description, linkUrl } = req.body;
  if (!title) return res.status(400).json({ error: 'A title is required.' });

  const { row } = await run(
    `INSERT INTO talents (student_id, title, category, description, media_path, link_url)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.session.userId, title.trim(), category || 'other', description || null,
     req.file ? publicPath(req.file) : null, linkUrl || null]
  );
  logActivity(req, 'create', 'talent', row.id, title);
  res.status(201).json(row);
}));

router.put('/:id/approve', requireRole('admin', 'counsellor'), ah(async (req, res) => {
  const { row } = await run('UPDATE talents SET is_approved = TRUE WHERE id = $1 RETURNING *', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Entry not found.' });
  // No Alerts notification — Alerts is admin announcements only. The student sees "Live"
  // status on their own entry in the Talent tab once approved.
  res.json(row);
}));

/** Idempotent like toggle. */
router.post('/:id/like', requireAuth, ah(async (req, res) => {
  const talent = await one('SELECT id FROM talents WHERE id = $1', [req.params.id]);
  if (!talent) return res.status(404).json({ error: 'Entry not found.' });

  const { count } = await run(
    'DELETE FROM talent_likes WHERE talent_id = $1 AND user_id = $2',
    [req.params.id, req.session.userId]
  );
  // Nothing deleted means it wasn't liked yet, so this click is the like.
  // ON CONFLICT guards the double-click race against the composite primary key.
  if (!count) {
    await run(
      'INSERT INTO talent_likes (talent_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, req.session.userId]
    );
  }

  const { count: likes } = await one(
    'SELECT COUNT(*)::int AS count FROM talent_likes WHERE talent_id = $1',
    [req.params.id]
  );
  res.json({ liked: !count, likeCount: likes });
}));

router.delete('/:id', requireAuth, ah(async (req, res) => {
  const talent = await one('SELECT * FROM talents WHERE id = $1', [req.params.id]);
  if (!talent) return res.status(404).json({ error: 'Entry not found.' });
  const isStaff = ['admin', 'counsellor'].includes(req.session.role);
  if (talent.student_id !== req.session.userId && !isStaff) {
    return res.status(403).json({ error: 'You can only remove your own entry.' });
  }
  await run('DELETE FROM talents WHERE id = $1', [req.params.id]);
  res.json({ success: true });
}));

module.exports = router;
