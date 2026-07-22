const express = require('express');
const { all, run } = require('../config/db');
const { ah, requireRole, logActivity } = require('../middleware/auth');

const router = express.Router();

/**
 * Public "Contact Us" enquiries. Anyone can submit (no account needed); only the
 * Counselling Centre staff and the District Administration can read them.
 * Kept separate from counselling_requests so general enquiries don't clutter the
 * clinical request queue.
 */

// Submit an enquiry (public).
router.post('/', ah(async (req, res) => {
  const { name, email, role, message } = req.body;
  if (!String(name || '').trim() || !String(message || '').trim()) {
    return res.status(400).json({ error: 'Please tell us your name and your message.' });
  }
  const { row } = await run(
    `INSERT INTO contact_messages (name, email, role, message)
     VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
    [String(name).trim(), (email || '').trim() || null, (role || '').trim() || null, String(message).trim()]
  );
  logActivity(req, 'create', 'contact_message', row.id, null);
  res.status(201).json({ success: true });
}));

// List enquiries (staff only).
router.get('/', requireRole('admin', 'counsellor'), ah(async (req, res) => {
  const rows = await all('SELECT * FROM contact_messages ORDER BY created_at DESC');
  res.json(rows);
}));

// Update the status of an enquiry (staff only): new → read → resolved.
router.put('/:id', requireRole('admin', 'counsellor'), ah(async (req, res) => {
  const { status } = req.body;
  if (!['new', 'read', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  const { row } = await run(
    'UPDATE contact_messages SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'Enquiry not found.' });
  logActivity(req, 'update', 'contact_message', row.id, status);
  res.json(row);
}));

module.exports = router;
