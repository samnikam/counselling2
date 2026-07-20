const express = require('express');
const { all, one, run } = require('../config/db');
const { ah, requireRole, logActivity } = require('../middleware/auth');
const { upload, publicPath } = require('../middleware/upload');

const router = express.Router();

/**
 * Visibility rule, used by every read below: a notice is visible if it is district-wide
 * (institution_id IS NULL) or belongs to the viewer's own institution. Staff see everything.
 */
router.get('/', ah(async (req, res) => {
  const role = req.session.role;
  const isStaff = role === 'admin' || role === 'counsellor';

  let sql = `SELECT n.*, u.full_name AS author_name, i.name AS institution_name
             FROM notices n
             LEFT JOIN users u ON n.author_id = u.id
             LEFT JOIN institutions i ON n.institution_id = i.id`;
  const params = [];

  if (!isStaff) {
    // Anonymous visitors (no session) see district-wide notices only — $1 is NULL for them,
    // and `n.institution_id = NULL` is never true, so the OR collapses to the public set.
    params.push(req.session.institutionId || null);
    sql += ` WHERE (n.institution_id IS NULL OR n.institution_id = $1)`;
  }
  sql += ` ORDER BY n.is_pinned DESC, n.created_at DESC LIMIT 100`;

  res.json(await all(sql, params));
}));

router.post('/', requireRole('admin', 'counsellor', 'institution'), upload.single('attachment'), ah(async (req, res) => {
  const { title, body, category, isPinned } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body are required.' });

  // An institution can only ever post to its own students; admin/counsellor post district-wide
  // unless they explicitly target one institution.
  const institutionId =
    req.session.role === 'institution'
      ? req.session.institutionId
      : req.body.institutionId || null;

  const { row } = await run(
    `INSERT INTO notices (title, body, category, institution_id, author_id, attachment, is_pinned)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      title.trim(),
      body,
      category || 'general',
      institutionId,
      req.session.userId,
      req.file ? publicPath(req.file) : null,
      isPinned === true || isPinned === 'true',
    ]
  );

  // Deliberately does NOT create notification rows. A notice is read in the Notices
  // section; Alerts is reserved for announcements an admin explicitly pushes from the
  // Notifications menu (POST /api/notifications/broadcast), so it stays meaningful
  // rather than mirroring every routine notice.
  logActivity(req, 'create', 'notice', row.id, title);
  res.status(201).json(row);
}));

router.put('/:id', requireRole('admin', 'counsellor', 'institution'), ah(async (req, res) => {
  const notice = await one('SELECT * FROM notices WHERE id = $1', [req.params.id]);
  if (!notice) return res.status(404).json({ error: 'Notice not found.' });
  // An institution may only touch notices it owns.
  if (req.session.role === 'institution' && notice.institution_id !== req.session.institutionId) {
    return res.status(403).json({ error: 'You can only edit your own notices.' });
  }

  const { title, body, category, isPinned } = req.body;
  const { row } = await run(
    `UPDATE notices SET title = COALESCE($1,title), body = COALESCE($2,body),
            category = COALESCE($3,category), is_pinned = COALESCE($4,is_pinned)
     WHERE id = $5 RETURNING *`,
    [title || null, body || null, category || null, typeof isPinned === 'boolean' ? isPinned : null, req.params.id]
  );
  res.json(row);
}));

router.delete('/:id', requireRole('admin', 'counsellor', 'institution'), ah(async (req, res) => {
  const notice = await one('SELECT * FROM notices WHERE id = $1', [req.params.id]);
  if (!notice) return res.status(404).json({ error: 'Notice not found.' });
  if (req.session.role === 'institution' && notice.institution_id !== req.session.institutionId) {
    return res.status(403).json({ error: 'You can only delete your own notices.' });
  }
  await run('DELETE FROM notices WHERE id = $1', [req.params.id]);
  logActivity(req, 'delete', 'notice', notice.id, notice.title);
  res.json({ success: true });
}));

module.exports = router;
