# Discipline OS — Deployment Guide

How Discipline OS is put online, kept up to date, and fixed when something goes wrong.
Everything here uses **free plans**.

- For using the app, see the [User Guide](USER_GUIDE.md).
- For the code and local development, see the [Developer Guide](DEVELOPER_GUIDE.md).

---

## Contents

1. [The live setup](#1-the-live-setup)
2. [Before you start](#2-before-you-start)
3. [Step 1 — Neon (database)](#3-step-1--neon-database)
4. [Step 2 — Render (API)](#4-step-2--render-api)
5. [Step 3 — Vercel (app)](#5-step-3--vercel-app)
6. [Step 4 — Connect the app to the API (CORS)](#6-step-4--connect-the-app-to-the-api-cors)
7. [Step 5 — cron-job.org (reminders)](#7-step-5--cron-joborg-reminders)
8. [Step 6 — Admin user (optional)](#8-step-6--admin-user-optional)
9. [Checking that it works](#9-checking-that-it-works)
10. [Updating the live app](#10-updating-the-live-app)
11. [Logs, rollback and monitoring](#11-logs-rollback-and-monitoring)
12. [Free-plan limits](#12-free-plan-limits)
13. [Troubleshooting](#13-troubleshooting)
14. [Keeping secrets safe](#14-keeping-secrets-safe)

---

## 1. The live setup

| Part | Service | Address |
|---|---|---|
| App (what users open) | **Vercel** | https://discipline-os-omega.vercel.app |
| API (backend) | **Render** — web service `discipline-os-api`, Singapore | https://discipline-os-api-q4ut.onrender.com |
| Database | **Neon** — project `discipline-os`, AWS Singapore, pooled connection | (private connection string) |
| Reminder timer | **cron-job.org** — calls the API every minute | — |
| Code | **GitHub** — `pratiksijapati/discipline-os`, branch `main` | https://github.com/pratiksijapati/discipline-os |

```mermaid
flowchart LR
    User["Phone / browser"] -- "opens" --> Vercel["Vercel<br/>React PWA"]
    User -- "API calls (HTTPS + JWT)" --> Render["Render<br/>Django API"]
    Render --> Neon[("Neon<br/>PostgreSQL")]
    Cron["cron-job.org"] -- "every minute" --> Render
    GitHub["GitHub main"] -- "push = auto-deploy" --> Vercel
    GitHub -- "push = auto-deploy" --> Render
```

The API and the database are both in **Singapore**, the closest region to Nepal, so every request
is quick.

**Files in the repo that drive deployment**

| File | Used by | What it does |
|---|---|---|
| `render.yaml` | Render | Blueprint: free web service, Singapore, build + start commands, health check, environment variables |
| `frontend/vercel.json` | Vercel | Vite build, sends every page URL to `index.html`, cache rules for the service worker, security headers |
| `backend/requirements.txt` | Render | Python packages, including `gunicorn` (server) and `whitenoise` (admin files) |
| `backend/config/settings.py` | Render | Reads all settings from environment variables; HTTPS, secure cookies and HSTS when `DEBUG=False` |

---

## 2. Before you start

You need:

- the code pushed to GitHub (`main` branch);
- a GitHub account, used to sign in to Neon, Render and Vercel;
- from your laptop's `backend/.env` file: `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (push keys).
  If you don't have them, run `.venv\Scripts\python.exe manage.py generate_vapid_keys` in `backend/`.

Do the steps **in order**: each one needs an address from the step before.

---

## 3. Step 1 — Neon (database)

1. Go to **neon.tech** → **Sign up** → **Continue with GitHub**.
2. On **"Welcome to Neon — create your first project"**:
   - **Project name:** `discipline-os`
   - **Region:** **AWS Asia Pacific (Singapore)** (the default is US East — change it)
   - **Services:** leave only **Postgres database** on. Object storage, Functions, AI gateway and
     Neon Auth stay **off** (the app has its own login).
   - **Create project**
3. Neon then shows **"Set up Neon with your coding agent"** with an *Agent prompt*. **Skip it** —
   it is for JavaScript projects. Click **Go to project**.
4. On **Branch overview** (`discipline-os / production`), click the **Postgres database** row,
   then **Connect**.
5. Turn **Connection pooling ON** and copy the connection string. It looks like:
   `postgresql://neondb_owner:••••@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
   — it must contain **`-pooler`**.
6. Save it in a **new, private text file** of its own (for example `Documents\neon-connection.txt`).

> ⚠️ **Never paste the connection string into any existing file** — not into the project, and
> especially not into PostgreSQL's `pg_hba.conf`. Replacing `pg_hba.conf` stops your *local*
> PostgreSQL from starting. (If that happens, see [Troubleshooting](#13-troubleshooting).)

---

## 4. Step 2 — Render (API)

1. Go to **render.com** → **Get Started** → sign up with **GitHub**.
2. On the dashboard (**Overview — You haven't created any services yet**), don't use
   *Deploy a Web Service* or *Create a Postgres database*. Instead click **+** (top right) →
   **Blueprint**.
3. Connect GitHub. GitHub shows **Install Render**:
   choose **Only select repositories** → `discipline-os` → **Install**.
   (Other GitHub accounts may also be listed on Render if your login can see them — ignore them.)
4. Back on **Create a new Blueprint Instance**, pick **pratiksijapati/discipline-os** → **Connect**.
5. On **You are deploying from a Blueprint**:
   - **Blueprint Name:** `discipline-os`
   - **Branch:** `main`
   - **Blueprint Path:** leave empty (uses `render.yaml`)
6. Render lists **Create web service discipline-os-api** and asks for five values:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string |
   | `CORS_ALLOWED_ORIGINS` | `https://placeholder.vercel.app` for now — fixed in Step 4 |
   | `VAPID_PUBLIC_KEY` | from `backend/.env` (only the part after `=`) |
   | `VAPID_PRIVATE_KEY` | from `backend/.env` (only the part after `=`) |
   | `VAPID_SUBJECT` | `mailto:` + your email |

   `SECRET_KEY` and `REMINDER_CRON_SECRET` are generated by Render automatically.
   `DEBUG=False`, `PYTHON_VERSION` and `DB_DISABLE_SERVER_SIDE_CURSORS=True` come from `render.yaml`.
7. **Deploy Blueprint.** The first build takes 1–5 minutes. It:
   installs packages → collects admin static files → **creates all tables in Neon** (migrations) →
   starts gunicorn.
8. When the service shows **Live**, copy its address (here
   `https://discipline-os-api-q4ut.onrender.com`) and open `/api/health/` on it:

   ```json
   {"status":"ok","database":"ok"}
   ```

---

## 5. Step 3 — Vercel (app)

1. Go to **vercel.com** → **Sign Up** → **Hobby** → **Continue with GitHub**.
2. **Add New… → Project.** Under **Import Git Repository**, click **Install** to add the Vercel
   GitHub app → **Only select repositories** → `discipline-os` → **Install**.
   (Ignore the *"Ask v0 to build"* box — that's Vercel's AI site builder.)
3. Click **Import** next to `discipline-os`.
4. On **Configure Project**:
   - **Project Name:** `discipline-os`
   - **Root Directory:** **`frontend`** ← important
   - **Application Preset:** *Vite* (shows "Set by vercel.json")
   - **Build and Output Settings:** leave as is
   - **Environment Variables:** add
     `VITE_API_URL` = `https://discipline-os-api-q4ut.onrender.com/api`
     for **Production and Preview** — it must start with `https://` and end with `/api`.
5. **Deploy** (about 1–2 minutes). You'll see **Congratulations!** with a picture of the login page.
   Skip the *"Turn Your Agent into a Vercel Expert"* box.
6. **Continue to Dashboard** → the **Domains** line shows your address. Ours is
   `discipline-os-omega.vercel.app` (Vercel adds a word when `discipline-os.vercel.app` is already
   taken by someone else).

> `VITE_API_URL` is baked into the app **when it's built**. If you change it later, open the
> latest deployment in Vercel and click **Redeploy**.

---

## 6. Step 4 — Connect the app to the API (CORS)

Browsers only let the app call the API if the API lists the app's address.

1. Render → **discipline-os-api** → **Environment**.
2. Edit `CORS_ALLOWED_ORIGINS` → `https://discipline-os-omega.vercel.app`
   (no slash at the end; several addresses can be separated by commas).
3. **Save Changes** → **Save, rebuild, and deploy**. Wait for **Live**.

Now open the app, create your account, and install it to your home screen
(see the [User Guide](USER_GUIDE.md#1-getting-started)).

---

## 7. Step 5 — cron-job.org (reminders)

Render's free plan has no background worker, so an outside timer triggers the reminder check every
minute. It also keeps the free server awake.

1. Render → **discipline-os-api** → **Environment** → find `REMINDER_CRON_SECRET` → reveal and copy it.
2. Sign up at **cron-job.org** → **Create cronjob**:
   - **Title:** `Discipline OS reminders`
   - **URL:** `https://discipline-os-api-q4ut.onrender.com/api/notifications/run/`
   - **Schedule:** every **1** minute
   - **Advanced:**
     - Request method: **POST**
     - Headers → add `X-Cron-Secret` = the secret from step 1
3. **Create**, then open the job's **History** after a couple of minutes — runs should show **200**.

| Response | Meaning |
|---|---|
| **200** | Working. The body says how many reminders were sent. |
| **404** | Wrong secret, missing header, or `REMINDER_CRON_SECRET` is empty on Render |
| **405** | Method is GET — change it to **POST** |
| Timeout on the first run | The server was asleep; the next runs will be fast |

---

## 8. Step 6 — Admin user (optional)

The Django admin (`https://discipline-os-api-q4ut.onrender.com/admin/`) needs a superuser.
Render's free plan has no shell, so create it from your laptop, pointed at Neon:

```powershell
cd "C:\My daily schedule\discipline-os\backend"
$env:DATABASE_URL = Get-Content "$env:USERPROFILE\Documents\neon-connection.txt"
.venv\Scripts\python.exe manage.py createsuperuser
Remove-Item Env:DATABASE_URL
```

The last line matters: it makes your laptop go back to the local database.

---

## 9. Checking that it works

```bash
# API and database
curl https://discipline-os-api-q4ut.onrender.com/api/health/
# → {"status":"ok","database":"ok"}

# The API allows the app (look for access-control-allow-origin)
curl -s -o /dev/null -D - -X OPTIONS \
  -H "Origin: https://discipline-os-omega.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  https://discipline-os-api-q4ut.onrender.com/api/auth/login/

# The app loads directly on an inner page
curl -s -o /dev/null -w "%{http_code}\n" https://discipline-os-omega.vercel.app/today   # → 200
```

| Check | Expected |
|---|---|
| `/api/health/` | `{"status":"ok","database":"ok"}` |
| `http://` address of the API | Redirects (301) to `https://` |
| `/api/auth/me/` without login | 401 |
| `/admin/` | Login page with styling |
| App `/today` opened directly | Loads (200) |
| Sign up and log in on the app | Works |
| Settings → Reminders → **Send test** | Notification arrives |
| Install the app on a phone | Opens full-screen from the home screen |

---

## 10. Updating the live app

**Code changes deploy automatically.** Render and Vercel both watch the `main` branch:

```powershell
git add -A
git commit -m "Describe the change"
git push
```

| What changed | What happens |
|---|---|
| `frontend/` | Vercel rebuilds (~1–2 min). Installed apps show **Update available**. |
| `backend/` | Render rebuilds (~1–5 min) and runs new **migrations** automatically. |
| A failed build | The previous version stays live. Check the build log and push a fix. |

**Settings (environment variables) are not code:**

| Where | How to apply a change |
|---|---|
| Render → Environment | **Save, rebuild, and deploy** |
| Vercel → Settings → Environment Variables | Then **Deployments → latest → ⋯ → Redeploy** |

Test locally before pushing (see the [Developer Guide](DEVELOPER_GUIDE.md#12-day-to-day-development-workflow)).

---

## 11. Logs, rollback and monitoring

| Need | Render (API) | Vercel (app) |
|---|---|---|
| See errors | Service → **Logs** | Project → **Deployments** → a deployment → **Build Logs** / **Logs** |
| See deploy history | Service → **Events** | Project → **Deployments** |
| Go back to the previous version | **Events** → an older deploy → **Rollback** | **Deployments** → an older one → ⋯ → **Promote to Production** / **Instant Rollback** |
| Database usage | — | Neon → project → **Usage** / **Monitoring** |

---

## 12. Free-plan limits

- **Render sleeps** after 15 minutes without requests; the next request takes up to ~1 minute.
  The every-minute cron job keeps it awake. One always-on service fits Render's free monthly hours.
- **Neon** pauses the database when idle; the cron job keeps it busy too, which uses Neon's free
  compute allowance. Check **Neon → Usage** after the first week. If it gets close to the limit,
  set the cron job to run only during your waking hours (reminders outside those hours won't send).
- **Vercel Hobby** is for personal, non-commercial use — fine for this project.
- **Render free** has no shell and no pre-deploy step; that's why migrations run during the build.

---

## 13. Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| App says it can't reach the server / login fails, browser console mentions **CORS** | `CORS_ALLOWED_ORIGINS` on Render doesn't match the Vercel address | Set it to exactly `https://discipline-os-omega.vercel.app` and redeploy. (Stray spaces and a trailing `/` are tolerated.) |
| Right after a deploy: *"'text/html' is not a valid JavaScript MIME type"* | An app opened before the deploy asked for the old build's files | Fixed in the app: it reloads itself into the new version. If it still shows, close the app fully and reopen. `vercel.json` must keep returning 404 for missing `/assets/*` files. |
| First load takes ~1 minute | Free Render server was asleep | Normal; set up the cron job (Step 5) |
| `/api/health/` shows an error or times out | Wrong `DATABASE_URL`, or Neon paused | Re-copy the pooled string from Neon → Connect; check Neon project isn't suspended |
| Render build fails at `migrate` | Database unreachable or a migration error | Read the last lines of the build log; fix and push |
| App calls `localhost` or the wrong API | `VITE_API_URL` missing or wrong when the app was built | Fix it in Vercel → Settings → Environment Variables, then **Redeploy** |
| Pages other than `/` show Vercel 404 | Root Directory isn't `frontend`, so `vercel.json` isn't used | Vercel → Settings → General → Root Directory = `frontend`, redeploy |
| Reminders never arrive | Cron not set up, notifications blocked, or iPhone app not installed | Step 5; allow notifications; on iPhone install to Home Screen first; try **Send test** |
| `discipline-os.vercel.app` shows someone else's site | That name was taken | Use your own domain from Vercel → Domains |
| **Local** PostgreSQL won't start after setup | Neon text pasted into `pg_hba.conf` | Restore `C:\Program Files\PostgreSQL\17\data\pg_hba.conf` with the standard rules below (Administrator PowerShell), then `Restart-Service postgresql-x64-17` |

Standard `pg_hba.conf` rules (password login for everything local):

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
host    replication     all             127.0.0.1/32            scram-sha-256
host    replication     all             ::1/128                 scram-sha-256
```

---

## 14. Keeping secrets safe

| Secret | Lives in | Never… |
|---|---|---|
| Neon connection string (has the DB password) | Render env, your private text file | …commit it, paste it into other files, or share it in chat |
| `VAPID_PRIVATE_KEY` | Render env, `backend/.env` | …commit it or put it in the frontend |
| `SECRET_KEY`, `REMINDER_CRON_SECRET` | Render env (generated), cron-job.org header | …share them |

- `.env` files are git-ignored; only `.env.example` files are committed.
- Only `VITE_*` variables reach the browser, and the frontend has no secrets.
- The GitHub repository is **public**, so treat everything committed as visible to anyone.
- If a secret leaks: create a new one (Neon → reset password, new VAPID keys with
  `generate_vapid_keys`), update it on Render, and redeploy.
