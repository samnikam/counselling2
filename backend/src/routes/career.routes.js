const express = require('express');
const { all, run } = require('../config/db');
const { ah, requireRole, logActivity } = require('../middleware/auth');
const { upload, publicPath } = require('../middleware/upload');

const router = express.Router();

// PDF §5.8 — career options, guidance sessions, skill resources. Public to read: a student
// deciding on a stream shouldn't need an account first.
router.get('/resources', ah(async (req, res) => {
  const params = [];
  let sql = `SELECT r.*, u.full_name AS author_name FROM career_resources r
             LEFT JOIN users u ON r.created_by = u.id`;
  if (req.query.category) {
    params.push(req.query.category);
    sql += ' WHERE r.category = $1';
  }
  sql += ' ORDER BY r.created_at DESC';
  res.json(await all(sql, params));
}));

router.post('/resources', requireRole('admin', 'counsellor'), upload.single('file'), ah(async (req, res) => {
  const { title, description, category, linkUrl } = req.body;
  if (!title) return res.status(400).json({ error: 'A title is required.' });
  const { row } = await run(
    `INSERT INTO career_resources (title, description, category, link_url, file_path, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [title.trim(), description || null, category || 'general', linkUrl || null,
     req.file ? publicPath(req.file) : null, req.session.userId]
  );
  logActivity(req, 'create', 'career_resource', row.id, title);
  res.status(201).json(row);
}));

router.delete('/resources/:id', requireRole('admin', 'counsellor'), ah(async (req, res) => {
  const { count } = await run('DELETE FROM career_resources WHERE id = $1', [req.params.id]);
  if (!count) return res.status(404).json({ error: 'Resource not found.' });
  res.json({ success: true });
}));

router.get('/sessions', ah(async (req, res) => {
  res.json(await all(
    `SELECT s.*, u.full_name AS author_name FROM career_sessions s
     LEFT JOIN users u ON s.created_by = u.id ORDER BY s.starts_at ASC`
  ));
}));

router.post('/sessions', requireRole('admin', 'counsellor'), ah(async (req, res) => {
  const { title, speaker, description, startsAt, venue } = req.body;
  if (!title || !startsAt) return res.status(400).json({ error: 'Title and date are required.' });
  if (Number.isNaN(Date.parse(startsAt))) return res.status(400).json({ error: 'Invalid date.' });
  const { row } = await run(
    `INSERT INTO career_sessions (title, speaker, description, starts_at, venue, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [title.trim(), speaker || null, description || null, startsAt, venue || null, req.session.userId]
  );
  res.status(201).json(row);
}));

router.delete('/sessions/:id', requireRole('admin', 'counsellor'), ah(async (req, res) => {
  const { count } = await run('DELETE FROM career_sessions WHERE id = $1', [req.params.id]);
  if (!count) return res.status(404).json({ error: 'Session not found.' });
  res.json({ success: true });
}));

module.exports = router;
