const express = require('express');
const { all, one, run } = require('../config/db');
const { ah, requireAuth, requireRole, logActivity } = require('../middleware/auth');
const { upload, publicPath } = require('../middleware/upload');

const router = express.Router();

// PDF §5.4. The public gallery shows approved media only; staff can see the queue too.
router.get('/', ah(async (req, res) => {
  const isStaff = ['admin', 'counsellor'].includes(req.session.role);
  const params = [];
  let sql = `SELECT g.*, u.full_name AS uploader_name, i.name AS institution_name
             FROM gallery_items g
             LEFT JOIN users u ON g.uploader_id = u.id
             LEFT JOIN institutions i ON g.institution_id = i.id
             WHERE 1 = 1`;

  // ?pending=1 is the moderation queue — staff only, never exposed publicly.
  if (req.query.pending === '1' && isStaff) {
    sql += ' AND g.is_approved = FALSE';
  } else if (!isStaff) {
    sql += ' AND g.is_approved = TRUE';
  }
  if (req.query.type) {
    params.push(req.query.type);
    sql += ` AND g.media_type = $${params.length}`;
  }
  sql += ' ORDER BY g.created_at DESC LIMIT 200';
  res.json(await all(sql, params));
}));

// :type picks the storage subdir (gallery|videos) — validated inside the upload middleware.
router.post('/:type', requireAuth, upload.single('file'), ah(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });
  const { title, caption } = req.body;
  if (!title) return res.status(400).json({ error: 'A title is required.' });

  const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  // Institutions and staff publish directly; student uploads wait for moderation.
  const autoApprove = ['admin', 'counsellor', 'institution'].includes(req.session.role);

  const { row } = await run(
    `INSERT INTO gallery_items (title, media_type, file_path, caption, uploader_id, institution_id, is_approved)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [title.trim(), mediaType, publicPath(req.file), caption || null,
     req.session.userId, req.session.institutionId || null, autoApprove]
  );
  logActivity(req, 'upload', 'gallery', row.id, mediaType);
  res.status(201).json(row);
}));

router.put('/:id/approve', requireRole('admin', 'counsellor'), ah(async (req, res) => {
  const { row } = await run(
    'UPDATE gallery_items SET is_approved = TRUE WHERE id = $1 RETURNING *',
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'Item not found.' });
  // No Alerts notification — Alerts is admin announcements only. Approved media simply
  // appears in the public gallery.
  logActivity(req, 'approve', 'gallery', row.id);
  res.json(row);
}));

router.delete('/:id', requireAuth, ah(async (req, res) => {
  const item = await one('SELECT * FROM gallery_items WHERE id = $1', [req.params.id]);
  if (!item) return res.status(404).json({ error: 'Item not found.' });

  const isStaff = ['admin', 'counsellor'].includes(req.session.role);
  const isOwner = item.uploader_id === req.session.userId;
  // An institution may clear media uploaded under its own name.
  const isOwnInstitution =
    req.session.role === 'institution' && item.institution_id === req.session.institutionId;
  if (!isStaff && !isOwner && !isOwnInstitution) {
    return res.status(403).json({ error: 'You cannot remove this item.' });
  }

  await run('DELETE FROM gallery_items WHERE id = $1', [req.params.id]);
  // The file itself is intentionally left on disk: deletes are rare, and unlinking risks
  // removing a file another row still references after a future copy/duplicate feature.
  logActivity(req, 'delete', 'gallery', item.id);
  res.json({ success: true });
}));

module.exports = router;
