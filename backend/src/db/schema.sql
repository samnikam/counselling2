-- District Student & Youth Digital Portal — Anantnag
-- Schema is idempotent: safe to run on every boot (CREATE ... IF NOT EXISTS throughout).

-- ─── Institutions (PDF §4: 78 Higher Secondary Schools + 10 Colleges) ───
CREATE TABLE IF NOT EXISTS institutions (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  type         TEXT NOT NULL CHECK (type IN ('hss', 'college')),
  zone         TEXT,
  address      TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Users (PDF §5.1) ───
-- One table for every actor. `role` drives all authorisation.
--   admin       — District Administration (superadmin; full access)
--   counsellor  — Counselling & Youth Development Centre staff
--   institution — a school/college account (scoped to institution_id)
--   student     — a student of an institution
--   alumni      — a former student, mentors current students
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('admin', 'counsellor', 'institution', 'student', 'alumni')),
  -- Required for institution/student, meaningless for admin/counsellor. Enforced in app code
  -- rather than a CHECK so an admin can re-assign a student between schools without fighting the constraint.
  institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
  class_year     TEXT,           -- e.g. "11th", "12th", "B.A. 2nd Year" (PDF §5.1: "class")
  phone          TEXT,
  bio            TEXT,
  avatar         TEXT,
  -- Students self-registering are unverified until their institution confirms them.
  is_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  -- Set on every seeded/staff-created account so a known password can't survive first login.
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_institution ON users(institution_id);

-- ─── Notices / announcements (PDF §5.2, §5.9) ───
CREATE TABLE IF NOT EXISTS notices (
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'general',
  -- NULL institution_id = district-wide notice, visible to everyone.
  -- Non-NULL = only that institution's students see it.
  institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
  author_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  attachment     TEXT,
  is_pinned      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notices_institution ON notices(institution_id);

-- ─── Events (PDF §5.6) ───
CREATE TABLE IF NOT EXISTS events (
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL DEFAULT 'event',  -- event | competition | workshop | awareness
  venue          TEXT,
  starts_at      TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ,
  capacity       INTEGER,          -- NULL = unlimited
  institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE, -- NULL = district-level
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  banner         TEXT,
  is_published   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id           SERIAL PRIMARY KEY,
  event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attended     BOOLEAN NOT NULL DEFAULT FALSE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- The DB, not the app, is what actually prevents double-registration under concurrency.
  UNIQUE (event_id, user_id)
);

-- ─── Counselling (PDF §5.7) — the most sensitive table in the system (§5.14) ───
CREATE TABLE IF NOT EXISTS counselling_requests (
  id            SERIAL PRIMARY KEY,
  -- NULL for a guest booking from the public site (no account required to ask for help).
  student_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  guest_name    TEXT,
  guest_phone   TEXT,
  counsellor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  request_type  TEXT NOT NULL CHECK (request_type IN ('stress', 'mental_health', 'career', 'academic', 'personal', 'other')),
  description   TEXT,
  preferred_date TIMESTAMPTZ,
  preferred_time TEXT,
  preferred_language TEXT,          -- PDF §5.13: english | hindi | urdu
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'assigned', 'scheduled', 'completed', 'cancelled')),
  -- Clinical notes. Readable ONLY by admin/counsellor — never returned to the student.
  session_notes TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_counselling_student ON counselling_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_counselling_status ON counselling_requests(status);

-- ─── Discussions (PDF §5.3) ───
CREATE TABLE IF NOT EXISTS discussions (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'general',
  author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_locked  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discussion_replies (
  id            SERIAL PRIMARY KEY,
  discussion_id INTEGER NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  author_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_replies_discussion ON discussion_replies(discussion_id);

-- ─── Gallery: photos & videos (PDF §5.4) ───
CREATE TABLE IF NOT EXISTS gallery_items (
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  media_type     TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  file_path      TEXT NOT NULL,
  caption        TEXT,
  uploader_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
  -- Student uploads are moderated before appearing publicly; staff uploads are auto-approved.
  is_approved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Talent showcase (PDF §5.5) ───
CREATE TABLE IF NOT EXISTS talents (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  media_path  TEXT,
  link_url    TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS talent_likes (
  talent_id INTEGER NOT NULL REFERENCES talents(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Composite PK: one like per user per talent, enforced by the DB rather than a read-then-write race.
  PRIMARY KEY (talent_id, user_id)
);

-- ─── Career guidance (PDF §5.8) ───
CREATE TABLE IF NOT EXISTS career_resources (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'general',
  link_url    TEXT,
  file_path   TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS career_sessions (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  speaker     TEXT,
  description TEXT,
  starts_at   TIMESTAMPTZ NOT NULL,
  venue       TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Alumni (PDF §5.10) ───
CREATE TABLE IF NOT EXISTS alumni_profiles (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
  graduation_year INTEGER,
  occupation     TEXT,
  organisation   TEXT,
  expertise      TEXT,
  linkedin_url   TEXT,
  open_to_mentor BOOLEAN NOT NULL DEFAULT TRUE,
  is_approved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Announcements (PDF §5.11) ───
-- One row per important message an admin sends. The admin's Notifications page lists these
-- so they can edit or delete something they sent; the per-recipient copies below link back
-- here and are removed/updated with the announcement.
CREATE TABLE IF NOT EXISTS announcements (
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  message        TEXT NOT NULL,
  audience       TEXT NOT NULL DEFAULT 'all',
  institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
  sent_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notifications (PDF §5.11) ───
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'general',
  link       TEXT,
  -- When this copy came from a broadcast, it points back to the announcement so editing or
  -- deleting the announcement cascades to every delivered copy.
  announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- Added after the fact for databases created before the announcements feature existed.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE;

-- ─── Audit trail (PDF §5.12 "track student participation", §5.14) ───
CREATE TABLE IF NOT EXISTS activity_log (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  INTEGER,
  detail     TEXT,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

-- ─── Portal settings (key/value, edited from the admin dashboard) ───
CREATE TABLE IF NOT EXISTS portal_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Contact enquiries (public "Contact Us" form → Counsellor/Admin dashboard) ───
CREATE TABLE IF NOT EXISTS contact_messages (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT,
  role       TEXT,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_messages(created_at DESC);
