# How to Deploy the Anantnag Youth Portal (Beginner Guide)

You do **not** need to understand the code. Just follow these steps in order.
We are using **Render** because it is the easiest — it runs the app and the
database together, for free to start.

Most of the hard configuration is already done for you in the `render.yaml`
file. You only have to click a few buttons and type one password.

---

## Step 1 — Put your project on GitHub

If your project is already on GitHub, skip to Step 2.

1. Create a free account at https://github.com
2. Create a new repository (call it anything, e.g. `anantnag-portal`).
3. Upload/push this whole project folder to it.
   (If you don't know how, tell me and I'll give you the exact commands.)

---

## Step 2 — Create a Render account

1. Go to https://render.com and click **Get Started** / **Sign up**.
2. Choose **Sign up with GitHub** (easiest). Allow Render to see your repositories.

---

## Step 3 — Deploy with one blueprint

1. In Render, click **New +**  →  **Blueprint**.
2. Choose the GitHub repository you created in Step 1.
3. Render reads the `render.yaml` file and shows you the app + database it will create.
4. It will ask you to enter **ADMIN_PASSWORD** — type a strong password here and
   **write it down**. This is the password for the first admin login.
5. Click **Apply** / **Create**.

Render now builds everything. This takes a few minutes. When it finishes, you get a
web address like `https://anantnag-portal.onrender.com`.

---

## Step 4 — First login

1. Open your new web address.
2. Click **Login → District Administrator**.
3. Email: `admin@dyedc-anantnag.gov.in`
   Password: the ADMIN_PASSWORD you typed in Step 3.
4. It will ask you to set a new password. Do it.
5. Go to **Admin → Institutions** and check the school/college list, then add your
   real counsellors under **Admin → Counsellors**.

That's it — your site is live and working. 🎉

---

## Important things to know (please read)

### 1. Free plan "sleeps"
On the free plan, the site goes to sleep after 15 minutes of no visitors, and takes
~30 seconds to wake up on the next visit. This is normal. Upgrading removes it.

### 2. Uploaded photos/videos disappear on the free plan
On the free plan, files people upload (gallery photos, videos) are **deleted every
time the app restarts or updates**. This is a Render free-tier limitation.

- **Fine for testing / showing people.**
- **Not fine for a real, permanent government site.**

To keep uploads forever, you need ONE of these (ask me and I'll set it up):
- **Add a Render "Disk"** (about $7/month) — simplest, keeps files on the server, or
- **Use cloud storage** (Cloudflare R2 / Amazon S3) — free/cheap and more professional.

### 3. Free database expires
Render's **free** database is temporary (it gets removed after ~30 days). For a real
launch, upgrade the database to a paid plan (a few dollars/month) so your data is safe,
or ask me to switch it to a free permanent database provider (Neon).

### 4. Change the helpline number and domain
The helpline `+91 1932 234 100` and the website address in a few files are
placeholders. Give me the real ones and I'll update them everywhere in one go.

---

## What was already fixed for you
- Removed the broken GitHub Pages setup that would have deployed a non-working site.
- Added this Render blueprint so the app + database + secure secret are set up automatically.
- The database tables create themselves automatically on first start — no manual step.

## If anything goes wrong
Copy the error message from Render's **Logs** tab and send it to me. I'll tell you
exactly what to change.
