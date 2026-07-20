# Anantnag Youth Portal — Backend

Node.js + Express + PostgreSQL API for the District Student & Youth Digital Portal.
Serves both the JSON API and the static frontend (in `../frontend`).

## Run locally

1. **Have PostgreSQL running** and create a database, e.g. `anantnag_portal`.
2. `cp .env.example .env` and set `DATABASE_URL` to your database.
3. Install and start:
   ```
   npm install
   npm start
   ```
   On first boot it creates all tables and seeds 78 schools, 10 colleges, and one admin.
4. Open http://localhost:3000 — click **Login** in the navbar.
   Dev admin: `admin@dyedc-anantnag.gov.in` / `admin123`

### Quick database with Docker (no local Postgres needed)
```
docker run -d --name anantnag-pg -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=anantnag_portal -p 55432:5432 postgres:16-alpine
```
Then set `DATABASE_URL=postgres://postgres:devpass@localhost:55432/anantnag_portal` in `.env`.

## Roles

| Role | Dashboard | Self-register? |
|------|-----------|----------------|
| admin | `/admin.html` | No — seeded / created by an admin |
| counsellor | `/counsellor.html` | No — created by an admin |
| institution | `/institution.html` | No — created by an admin per school/college |
| student | `/student.html` | Yes |
| alumni | `/alumni.html` | Yes |

## Deploying (Render / Railway / any Node host)

**GitHub Pages cannot run this** — it only serves static files. Deploy the backend to a
Node host and point it at a managed Postgres.

Required environment variables in production:

| Variable | Notes |
|----------|-------|
| `NODE_ENV=production` | Enables secure cookies + proxy trust. Easy to forget; logins break without it. |
| `DATABASE_URL` | Managed Postgres connection string. |
| `PGSSL=require` | Needed by most managed Postgres providers. |
| `SESSION_SECRET` | 32+ random chars. The app refuses to start without it in production. |
| `ADMIN_PASSWORD` | Sets the first admin's password. Required on first boot in production. |
| `ALLOWED_ORIGINS` | Only if the frontend is hosted on a different domain than the API. |
| `UPLOAD_DIR` | Point at a **mounted persistent volume** — otherwise uploads vanish on redeploy. |

Build/start commands: install `npm install`, start `npm start` (runs migrate + seed automatically).
