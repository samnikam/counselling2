const { run } = require('../config/db');

/** Wraps an async route so a rejected promise reaches the error handler (Express 4 won't do this). */
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  next();
}

/**
 * Role gate. Always compose after requireAuth so an anonymous request gets a 401
 * ("sign in") rather than a 403 ("you are not allowed") — different meanings to the UI.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Please sign in to continue.' });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'You do not have access to this resource.' });
    }
    next();
  };
}

/** Fire-and-forget audit trail. Never blocks or fails the request it is recording. */
function logActivity(req, action, entity, entityId, detail) {
  const userId = req.session && req.session.userId ? req.session.userId : null;
  run(
    'INSERT INTO activity_log (user_id, action, entity, entity_id, detail, ip) VALUES ($1,$2,$3,$4,$5,$6)',
    [userId, action, entity || null, entityId || null, detail || null, req.ip || null]
  ).catch((err) => console.error('activity_log write failed:', err.message));
}

module.exports = { ah, requireAuth, requireRole, logActivity };
