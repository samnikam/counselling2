const express = require('express');
const { all } = require('../config/db');
const { ah } = require('../middleware/auth');

const router = express.Router();

/**
 * Public, read-only portal settings. Only keys on this whitelist are ever exposed —
 * the public site uses them to show the footer contact details managed from
 * Admin → Settings. Everything else in portal_settings stays admin-only.
 */
const PUBLIC_KEYS = [
  'portal_name',
  'helpline_phone',
  'contact_email',
  'office_address',
  'working_hours',
  'content_reviewed_on',
];

router.get('/', ah(async (req, res) => {
  const rows = await all(
    'SELECT key, value FROM portal_settings WHERE key = ANY($1)',
    [PUBLIC_KEYS]
  );
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}));

module.exports = router;
