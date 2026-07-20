const path = require('path');
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const { pool } = require('./config/db');
const { seed } = require('./db/seed');

const app = express();

// The frontend (the static site in ../frontend) is served from this same process.
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');

// Behind a TLS-terminating proxy (Render/Railway/Nginx), Express needs this so secure
// cookies are sent and req.ip reflects the real client rather than the proxy.
if (env.IS_PROD) app.set('trust proxy', 1);

// CSP is disabled because the existing frontend uses inline styles/scripts throughout;
// the rest of helmet's headers (HSTS, no-sniff, frameguard) still apply.
app.use(helmet({ contentSecurityPolicy: false }));

// CORS: the frontend is same-origin by default, so this only matters when it is hosted
// separately (e.g. GitHub Pages). Same-origin/no-origin requests are always allowed.
const allowlist = env.ALLOWED_ORIGINS;
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowlist.length === 0 || allowlist.includes(origin)) return cb(null, true);
    cb(new Error('NOT_ALLOWED_BY_CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Sessions in Postgres — survives redeploys on ephemeral-disk hosts and works across multiple
// instances, neither of which a file/in-memory store can do.
app.use(session({
  store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: env.IS_PROD,
  },
}));

// Blunt scraping/abuse guard on the whole API. Login has its own stricter limiter.
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
}));

// Uploaded files: static, never executed. Long cache since names are content-unique UUIDs.
app.use('/uploads', express.static(env.UPLOAD_DIR, { maxAge: '7d' }));

// ─── API ───
app.use('/api/auth', require('./routes/auth.routes').router);
app.use('/api/institutions', require('./routes/institutions.routes'));
app.use('/api/institution/students', require('./routes/institutionStudents.routes'));
app.use('/api/notices', require('./routes/notices.routes'));
app.use('/api/events', require('./routes/events.routes'));
app.use('/api/counselling', require('./routes/counselling.routes'));
app.use('/api/discussions', require('./routes/discussions.routes'));
app.use('/api/gallery', require('./routes/gallery.routes'));
app.use('/api/talents', require('./routes/talents.routes'));
app.use('/api/career', require('./routes/career.routes'));
app.use('/api/alumni', require('./routes/alumni.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─── Frontend (static site + dashboard pages) ───
app.use(express.static(FRONTEND_DIR));

// SPA-style fallback for the dashboard pages so a hard refresh on /admin.html still works.
// Anything under /api that reached here is a genuine 404, not a page.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ─── Centralised error handler ───
// Keeps stack traces off the wire and turns known errors into clean JSON.
app.use((err, req, res, next) => {
  if (err.message === 'NOT_ALLOWED_BY_CORS') return res.status(403).json({ error: 'Origin not allowed.' });
  if (err.message === 'INVALID_FILE_TYPE') return res.status(400).json({ error: 'That file type is not allowed.' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `File is too large (max ${env.MAX_UPLOAD_MB} MB).` });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

// ─── Start ───
seed()
  .then(() => {
    app.listen(env.PORT, () => {
      console.log(`\n  Anantnag Youth Portal — API + site on http://localhost:${env.PORT}`);
      if (!env.IS_PROD) {
        console.log(`  Dev admin: ${env.ADMIN_EMAIL} / ${env.ADMIN_PASSWORD}\n`);
      }
    });
  })
  .catch((err) => {
    // Node throws an AggregateError when it tries both IPv6 and IPv4 and both fail; its
    // .message is empty, which would otherwise print a blank, useless "Startup failed:".
    const causes = err.errors ? err.errors : [err];
    const detail = causes.map((e) => e.message || String(e)).join(' / ');
    const code = causes[0] && causes[0].code;

    console.error('\n  Startup failed: ' + (detail || err));

    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
      const url = env.DATABASE_URL || '(PGHOST/PGUSER env vars)';
      console.error('\n  Could not reach PostgreSQL at: ' + url.replace(/:[^:@/]*@/, ':****@'));
      console.error('  The database is not running, or DATABASE_URL in backend/.env is wrong.\n');
      console.error('  If you are using the Docker database:');
      console.error('    1. Open Docker Desktop and wait for it to start');
      console.error('    2. docker start anantnag-pg');
      console.error('    3. npm start\n');
      console.error('  If the container no longer exists, recreate it:');
      console.error('    docker run -d --name anantnag-pg -e POSTGRES_PASSWORD=devpass \\');
      console.error('      -e POSTGRES_DB=anantnag_portal -p 55432:5432 postgres:16-alpine\n');
    } else if (code === '28P01') {
      console.error('\n  The database rejected the username/password in DATABASE_URL (backend/.env).\n');
    } else if (code === '3D000') {
      console.error('\n  That database does not exist yet. Create it, or check the name in DATABASE_URL.\n');
    }
    process.exit(1);
  });
