const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const IS_PROD = process.env.NODE_ENV === 'production';

// Fail fast and loudly at boot rather than degrading into a subtly-insecure runtime.
// A portal holding counselling records must never start with a guessable secret or admin password.
function requireInProd(name) {
  const value = process.env[name];
  if (IS_PROD && !value) {
    throw new Error(
      `${name} must be set in production. Refusing to start with an insecure default.`
    );
  }
  return value;
}

const env = {
  IS_PROD,
  PORT: parseInt(process.env.PORT || '3000', 10),

  DATABASE_URL: process.env.DATABASE_URL,
  // Managed Postgres (Render/Railway/Supabase/Neon) terminates TLS with certs that
  // aren't in Node's trust store, so verification is relaxed only when explicitly asked for.
  PGSSL: process.env.PGSSL === 'require',

  SESSION_SECRET: requireInProd('SESSION_SECRET') || 'dev-only-insecure-secret-change-me',

  // Seeded once, on an empty database only. After that the account lives in Postgres
  // and this value is never read again.
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@dyedc-anantnag.gov.in',
  ADMIN_PASSWORD: requireInProd('ADMIN_PASSWORD') || 'admin123',

  // The frontend is served from this same process by default, so its own origin is
  // always allowed; extend when the frontend is hosted separately (e.g. GitHub Pages).
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'),
  MAX_UPLOAD_MB: parseInt(process.env.MAX_UPLOAD_MB || '25', 10),
};

if (!env.DATABASE_URL && !process.env.PGHOST) {
  throw new Error('DATABASE_URL (or PGHOST/PGUSER/PGDATABASE) must be set — this app requires PostgreSQL.');
}

module.exports = env;
