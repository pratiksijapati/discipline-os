# Discipline OS — Developer Guide

How the system is built, how to run it locally, and the design decisions behind it.
For what the app does from a user's point of view, see the [User Guide](USER_GUIDE.md).
For going live and keeping it running, see the [Deployment Guide](DEPLOYMENT_GUIDE.md).

---

## Contents

1. [Overview](#1-overview)
2. [Tech stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Repository layout](#4-repository-layout)
5. [Local setup](#5-local-setup)
6. [Configuration](#6-configuration)
7. [Backend](#7-backend)
8. [API reference](#8-api-reference)
9. [Frontend](#9-frontend)
10. [Key design decisions](#10-key-design-decisions)
11. [Testing and quality checks](#11-testing-and-quality-checks)
12. [Day-to-day development workflow](#12-day-to-day-development-workflow)
13. [How it was developed](#13-how-it-was-developed)
14. [Known limitations and ideas](#14-known-limitations-and-ideas)

---

## 1. Overview

Discipline OS is a mobile-first **Progressive Web App** for personal discipline: a daily schedule
built from repeating templates, tasks, habits, workouts, goals, a night review, a computed daily
**discipline score** with streaks, analytics, Web Push reminders and a camera-based wake-up challenge.

It is a classic two-part web system:

- a **React + TypeScript** single-page app (installable, works offline for its shell), and
- a **Django REST Framework** JSON API backed by **PostgreSQL**, with JWT authentication.

Every record belongs to one user; the API never returns another user's data.

**Live:** app https://discipline-os-omega.vercel.app · API https://discipline-os-api-q4ut.onrender.com
· code https://github.com/pratiksijapati/discipline-os

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, React Router 7, TanStack Query 5, axios, lucide-react icons |
| Styling | CSS Modules + CSS custom-property design tokens, light/dark themes |
| PWA | vite-plugin-pwa 2 (Workbox `generateSW`), @vite-pwa/assets-generator |
| Charts | Hand-built SVG components (no chart library) |
| Backend | Python 3.11, Django 5.2, Django REST Framework 3.16, SimpleJWT 5.5 |
| Database | PostgreSQL 17 (psycopg 3) |
| Push | pywebpush + VAPID (Web Push protocol) |
| Config | django-environ (`.env`), Vite env (`VITE_*`) |
| Production | gunicorn + whitenoise on Render, Neon Postgres, Vercel for the frontend |
| Quality | Django test runner (134 tests), `tsc -b`, oxlint |

---

## 3. Architecture

```mermaid
flowchart LR
    subgraph Phone["Phone / browser"]
        UI["React SPA<br/>(TanStack Query cache)"]
        SW["Service worker<br/>app shell + push handler"]
    end
    subgraph Render["Render (API)"]
        API["Django + DRF<br/>gunicorn"]
    end
    DB[("PostgreSQL<br/>Neon")]
    Cron["cron-job.org<br/>every minute"]
    Push["Browser push service<br/>(FCM / Mozilla / Apple)"]

    UI -- "HTTPS JSON + JWT" --> API
    API --> DB
    Cron -- "POST /api/notifications/run/<br/>X-Cron-Secret" --> API
    API -- "VAPID-signed, encrypted" --> Push
    Push --> SW
    SW -- "open /wake, /today…" --> UI
```

**Request flow.** The SPA calls the API with a short-lived access token in the `Authorization`
header. Views filter every queryset by `request.user`. Read endpoints such as
`/api/dashboard/today/` assemble a whole screen's data in one call so the phone makes few requests.

**Time.** The server stores everything in UTC. Each user has a time zone; "today", "now",
"missed" and score days are computed in the user's local time (`core/time.py`).

---

## 4. Repository layout

```
discipline-os/
├── backend/
│   ├── config/            settings, root urls, wsgi
│   ├── core/              shared: base model, time helpers, error handler, pagination, mixins, choices, test helpers
│   ├── users/             email-login User, UserSettings, auth + settings endpoints
│   ├── planner/           ScheduleTemplate/ScheduleItem (recurring plan), Routine/RoutineItem/RoutineLog
│   ├── tasks/             Task
│   ├── habits/            Habit, HabitLog
│   ├── workouts/          Exercise, WorkoutPlan, WorkoutSession, WorkoutSet
│   ├── goals/             Goal, GoalProgress
│   ├── reflections/       DailyReflection (night review)
│   ├── discipline/        dashboard assembly, scoring, DailyScore, streaks, analytics
│   ├── notifications/     push subscriptions, preferences, reminder engine, commands
│   ├── challenges/        WakeChallengeSession (wake-up challenge)
│   └── requirements.txt
├── frontend/
│   ├── public/            favicon, push-handler.js (imported by the service worker)
│   ├── src/
│   │   ├── api/           axios client, token storage, error mapping, query keys
│   │   ├── auth/          AuthProvider, route guards, hooks
│   │   ├── components/    ui/ kit, charts/, pwa/, toast/, shared widgets
│   │   ├── hooks/         small cross-cutting hooks
│   │   ├── layouts/       AppShell (nav), AuthLayout
│   │   ├── modules/       one folder per feature: api.ts, hooks.ts, types.ts, components/
│   │   ├── pages/         route screens (lazy-loaded)
│   │   ├── services/      PWA install handling
│   │   ├── styles/        global CSS + design tokens
│   │   ├── theme/         light/dark/system theme
│   │   ├── types/         shared types (auth, settings)
│   │   └── utils/         date/time/duration helpers
│   ├── vite.config.ts     PWA manifest + Workbox config
│   └── vercel.json        SPA rewrites + cache headers
├── docs/                  USER_GUIDE, DEVELOPER_GUIDE (this file), DEPLOYMENT_GUIDE
├── render.yaml            Render blueprint (API)
└── README.md              project overview
```

Each backend app follows the same shape: `models.py`, `serializers.py`, `views.py`, `urls.py`,
`admin.py`, `tests.py`, plus a `services.py` when there is real business logic.

---

## 5. Local setup

### Prerequisites

Python 3.11, Node 22 + npm, PostgreSQL 17, Git.

### Database

Create a role and database (in `psql` as the `postgres` superuser):

```sql
CREATE ROLE discipline_user WITH LOGIN PASSWORD 'choose-a-password' CREATEDB;
CREATE DATABASE discipline_os OWNER discipline_user;
```

`CREATEDB` lets the test runner create its throwaway test database.

### Backend (PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env          # then edit .env: SECRET_KEY, DATABASE_URL, CORS
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py createsuperuser
.venv\Scripts\python.exe manage.py runserver
```

API: `http://localhost:8000/api/health/` → `{"status":"ok","database":"ok"}`. Admin: `/admin/`.

Optional — reminders locally:

```powershell
.venv\Scripts\python.exe manage.py generate_vapid_keys   # paste the output into .env
.venv\Scripts\python.exe manage.py reminder_worker       # sends due reminders every minute
```

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env          # VITE_API_URL=http://localhost:8000/api
npm run dev                          # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload (no service worker) |
| `npm run build` | Type-check (`tsc -b`) then production build to `dist/` |
| `npm run preview` | Serve the built `dist/` (service worker active) |
| `npm run lint` | oxlint |
| `npm run dev:alt` / `pwa:alt` | Same on ports 5174 / 4174 using `.env.alt` (to run beside another project) |

> **PowerShell note:** `npm run x -- --flag` loses the `--`; use the `*:alt` scripts instead.

---

## 6. Configuration

### Backend (`backend/.env`, or Render environment)

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret (Render generates it) |
| `DEBUG` | `True` locally; `False` in production enables HTTPS redirect, secure cookies, HSTS |
| `ALLOWED_HOSTS` | Comma list; Render's own hostname is added automatically |
| `DATABASE_URL` | `postgres://user:pass@host:5432/db` (Neon adds `?sslmode=require`) |
| `DB_CONN_MAX_AGE` | Persistent connection seconds (default 60) |
| `DB_DISABLE_SERVER_SIDE_CURSORS` | `True` behind Neon's transaction-mode pooler |
| `CORS_ALLOWED_ORIGINS` | Frontend origin(s) allowed to call the API (spaces and trailing `/` are stripped) |
| `CSRF_TRUSTED_ORIGINS` | For the admin site (Render origin added automatically) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push keys; empty = push disabled |
| `REMINDER_CRON_SECRET` | Enables `POST /api/notifications/run/` for an external cron |
| `LOG_LEVEL`, `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS` | Optional production tuning |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API base URL, e.g. `https://discipline-os-api.onrender.com/api` |

Only `VITE_*` variables reach the browser — never put secrets in the frontend env.
`.env` files are git-ignored; only `.env.example` files are committed.

---

## 7. Backend

### Shared conventions (`core/`)

| Piece | What it does |
|---|---|
| `TimeStampedModel` | Abstract base with `created_at` / `updated_at` |
| `OwnedQuerysetMixin` | Filters every viewset queryset by `request.user` and sets `user` on create — another user's id returns **404**, not 403 |
| `api_exception_handler` | Every error has one shape: `{"detail": "...", "code": "...", "errors": {field: [msgs]}}` |
| `StandardPagination` | Page-number pagination (20 per page) for history-style lists |
| `time.py` | `user_today(user)`, `user_now(user)`, time zone validation |
| `choices.py` | Shared enums: `Priority`, `ChallengeType` |
| `testing.py` | `AuthedAPITestCase`, `frozen_local_time` for deterministic time tests |

DRF defaults: JWT authentication, `IsAuthenticated` on everything (opt-out per view),
scoped throttling on auth endpoints (`auth` 20/min, `auth_refresh` 60/min),
decimals serialised as numbers.

### Apps and models

| App | Models | Notes |
|---|---|---|
| `users` | `User` (email login), `UserSettings` (one-to-one) | Settings: theme, week start, workout target, wake time + grace, score weights, streak threshold, daily target, wake challenge options, `onboarding_completed` |
| `planner` | `ScheduleTemplate`, `ScheduleItem`, `Routine` (`kind`: morning / minimum), `RoutineItem`, `RoutineLog`, `MinimumDay` | Recurring plan materialised lazily per day; one default morning routine and at most one Minimum Day checklist per user |
| `tasks` | `Task`, `DailyFocus` | Today / upcoming / someday / completed views; one focus per user per day |
| `habits` | `Habit`, `HabitLog` | boolean / quantity / duration; daily / selected days / times-per-week |
| `workouts` | `Exercise`, `WorkoutPlan`, `PlanExercise`, `WorkoutSession`, `SessionExercise`, `WorkoutSet` | One active session per user; plan is snapshotted at start |
| `goals` | `Goal`, `GoalProgress` | Progress is an append-only log with undo; status derived |
| `reflections` | `DailyReflection` | Autosaved draft; stats snapshot frozen on completion |
| `discipline` | `DailyScore` | Score per user per day (breakdown JSON incl. `max_ratio`, `minimum_day`); past days final |
| `notifications` | `PushSubscription`, `NotificationPreference`, `SentReminder` | Idempotent reminder delivery |
| `challenges` | `WakeChallengeSession` | Server-checked wake-up challenge |

### Management commands

| Command | Use |
|---|---|
| `generate_vapid_keys` | Create a VAPID key pair for Web Push |
| `send_reminders` | Send all reminders due right now (one pass) |
| `reminder_worker` | Loop: `send_reminders` every minute (local / a worker host) |

---

## 8. API reference

All paths are under `/api/`. All except auth, health and the cron hook require
`Authorization: Bearer <access token>`.

**Auth & account**

| Method | Path | Purpose |
|---|---|---|
| GET | `health/` | API + database check (public) |
| POST | `auth/register/` | Create account → user + tokens |
| POST | `auth/login/` | Email + password → `{access, refresh, user}` |
| POST | `auth/refresh/` | Rotate refresh token → new pair (old one blacklisted) |
| POST | `auth/logout/` | Blacklist the refresh token |
| GET/PATCH | `auth/me/` | Profile (name, time zone) |
| POST | `auth/change-password/` | Change password |
| GET/PATCH | `settings/` | User settings |

**Today & schedule**

| Method | Path | Purpose |
|---|---|---|
| GET | `dashboard/today/` | Everything for the Today screen in one response |
| CRUD | `schedule-templates/` | Repeating plan rules |
| CRUD | `schedule/` | Day items for a range (`?start=&end=`, default today); PATCH status |
| CRUD | `routines/`, `routine-items/` | Morning routine; `routines/today/`, `routines/{id}/reorder/`, `routine-items/{id}/check/` |
| CRUD | `tasks/` | Tasks with `?view=today|upcoming|someday|completed` |
| GET/POST/PATCH/DELETE | `daily-focus/` | Today's Focus: `daily-focus/today/`, one per day, `completed` stamps `completed_at` |
| GET/POST/DELETE | `minimum-day/` | Today's Minimum Day state; POST `{reason?}` starts it (needs a list), DELETE ends it |
| PUT | `minimum-day/checklist/` | `{items: [...]}` — set the Minimum Day list (trimmed, de-duplicated, ticks kept) |

**Habits, workouts, goals, review**

| Method | Path | Purpose |
|---|---|---|
| CRUD | `habits/` | + `habits/today/`, `habits/{id}/log/`, `habits/reorder/` |
| CRUD | `exercises/` | + `exercises/{id}/history/` |
| CRUD | `workout-plans/` | + `workout-plans/starter/` |
| CRUD | `workouts/` | Sessions: `active/`, `stats/`, `{id}/pause|resume|complete|cancel/`, `{id}/sets/`, `{id}/exercises/` |
| PATCH/DELETE | `workout-sets/{id}/` | Edit or remove a set |
| CRUD | `goals/` | + `goals/{id}/progress/` (`{amount, mode: add|set}`), `goals/{id}/main/` |
| DELETE | `goal-progress/{id}/` | Undo a progress entry |
| GET/PATCH | `reflections/current/` | Tonight's review (autosave); `current/complete/` closes the day |
| GET | `reflections/` | Completed review history |

**Score, analytics, reminders, wake-up**

| Method | Path | Purpose |
|---|---|---|
| GET | `discipline/today/` | Live score + breakdown + `max_possible` + streaks |
| GET | `discipline/scores/?start=&end=` | Daily scores in a range |
| GET | `progress/?range=7d|30d|90d|365d` | Analytics overview |
| GET | `progress/weekly/?offset=0` | Weekly review (0 = this week), incl. `insight` and `minimum_days` |
| GET | `notifications/config/` | VAPID public key / push availability |
| POST/DELETE | `notifications/subscriptions/` | Register / remove this device's push subscription |
| GET/PATCH | `notifications/preferences/` | Which reminders, when |
| POST | `notifications/test/` | Test notification; with `{endpoint}` only this device → `{delivered, this_device}` |
| POST | `notifications/run/` | Cron hook (`X-Cron-Secret`), 404 when not configured |
| GET | `wake/today/` | Challenge config, today's completion, wake-up streak |
| POST | `wake/sessions/` | Start (`method`: camera/manual/math, optional `challenge_type`) — math problems generated server-side |
| POST | `wake/sessions/{id}/complete/` | Finish (`active_seconds` or `answers`) |

---

## 9. Frontend

### Data layer

- **`api/client.ts`** — one axios instance. A request interceptor adds the access token; on
  `401` a response interceptor refreshes **once** (concurrent requests share the same refresh
  promise) and retries. If refresh fails, the session ends and the user goes to login.
- **Tokens** — the access token lives only in memory; the refresh token in `localStorage`
  (`dos.refresh`) so the session survives closing the app. Refresh tokens rotate and the old one is
  blacklisted server-side.
- **TanStack Query** — all server state. Keys are centralised in `api/queryKeys.ts`; mutations
  invalidate the dashboard and related keys. Checkbox-style actions (tasks, schedule items, habits)
  are **optimistic** and roll back on error.

### Feature modules

Each folder in `src/modules/` holds `api.ts` (typed calls), `hooks.ts` (queries/mutations),
`types.ts` and `components/`. Pages in `src/pages/` compose modules and are **lazy-loaded**
(`pages/lazyPages.ts`) so the first load stays small.

Modules added in the usability round: `focus` (Today's Focus), `minimum` (Minimum Day),
`quickadd` (the + chooser and the shared definitions in `kinds.ts`), `onboarding` (setup wizard steps).
`today` holds the Today building blocks: `NowNext`, `DayTimeline`, `TodaySummaryList`, the nudge cards.

**Stale builds.** After a deploy, an open page may ask for code files that no longer exist.
`services/staleBuild.ts` detects that (lazy pages and `vite:preloadError`) and reloads once into the
new build (at most once per 30 s); any other crash shows `RouteErrorPage` instead of a developer
error. `vercel.json` only rewrites extension-less paths to `index.html`, so a missing file is a 404.

### Routing

`router.tsx`: `/login` and `/register` (redirect away if signed in); everything else inside
`RequireAuth` + `AppShell` (bottom nav on phones, sidebar on desktop). `/wake` is outside the
shell — full screen, opened from the wake-up notification.

### UI kit and styling

`components/ui/` contains Button, Field (Text/Select/TextArea), Card, Sheet (native `<dialog>`),
ConfirmDialog, CheckButton, Fab, ProgressRing, Badge, Switch, Stepper, DayPicker,
SegmentedControl, EmptyState, FormAlert, Spinner. Styling uses CSS Modules and tokens in
`styles/` (`--space-*`, `--text-*`, `--radius-*`, colours, `--tap` = minimum touch size).
Dark mode redefines the tokens; the theme can follow the system.

### PWA

- `vite.config.ts` configures the manifest (start URL `/today`, standalone, shortcuts) and
  Workbox to precache **only the app shell**. API responses are never cached, so offline the app
  shows an offline banner instead of stale numbers.
- `registerType: "prompt"` — a new version shows **Update available** (`components/pwa/UpdatePrompt`),
  checked hourly.
- `public/push-handler.js` is imported into the generated service worker: it shows push
  notifications and focuses/opens the right page on tap.

### Charts

`components/charts/` has a line chart (crosshair tooltip, keyboard arrows, target line) and a
column chart drawn in SVG, plus a "Show as table" data table for accessibility. The chart colour
was checked for contrast in both themes.

### Wake-up challenge (`modules/wake/`)

`motion.ts` draws front-camera frames into a 64×48 canvas, converts to grayscale and measures the
share of pixels that changed between frames. The timer advances only while that share is above a
threshold (smoothed, with a short grace period). `useWakeLock` keeps the screen on; `useBeat`
synthesises a beat with the Web Audio API. No video leaves the device.

---

## 10. Key design decisions

**Recurring schedule = template + lazily created items.**
`ScheduleTemplate` stores the rule; the first time a day is read, `ScheduleItem`s are created for
it with `unique(template, occurrence_date)`. Editing one day sets `is_customized`; removing one day
leaves an `is_removed` tombstone so it isn't re-created. Editing the template updates future,
uncustomised items. This keeps history exact and avoids generating rows for years ahead.

**"Missed" is derived, never stored.** An upcoming item whose end time has passed is *displayed* as
missed (`planner/status.py`), so marking it done later just works.

**Discipline score = weighted share of what applies.**
Seven components (wake-up 15, morning routine 10, workout 20, important tasks 25, habits 15,
growth 10, reflection 5). Each returns `applicable`, a `ratio` (0–1, partial credit) and a
human-readable detail. The score is `Σ weight×ratio / Σ applicable weights × 100`, so users are
never penalised for features they don't use. Weights are user-configurable.

**Past days are frozen.** `DailyScore` for today is recalculated on read; earlier days are
finalised once (`engine.finalize_past_days`) and never change, which keeps streaks and analytics
honest and cheap.

**Streaks skip untracked days**, and an unfinished today never breaks a streak.
Analytics averages use **finished days only**.

**Night review date.** Before 04:00 local time, the "current" review is still yesterday's.

**Workouts snapshot the plan.** Starting a session copies the plan's exercises, so editing a plan
later doesn't rewrite history. Exercise foreign keys use `RESTRICT` (not `PROTECT`) so deleting a
user (e.g. from the admin) still cascades cleanly.

**Reminders are idempotent.** `SentReminder(user, key)` is unique and written *before* sending,
so overlapping cron runs can't double-send. Due checks include a 5-minute catch-up window. Dead
subscriptions (404/410 from the push service) are deleted.

**Wake-up challenge can't be faked from the client.** The server checks that wall-clock time
since start ≥ target and reported active seconds ≥ target (3 s tolerance); math answers are kept
server-side and only the questions are sent. The challenge only counts toward the score once a
user has completed it at least once, so new accounts aren't scored on a feature they never used.

**"You can still reach X today."** Each score part stores `max_ratio` — what it can still reach today
(1.0, except wake-up after the deadline: 0.5). `max_possible` uses the same formula as the score, so the
two always agree; a final day's maximum is its score.

**Today's Focus counts inside "Important tasks"**, as one more important item, so score weights never change.

**Moving keeps the routine intact.** A move PATCHes one occurrence's `date`/times (`occurrence_date` stays,
so the template can't regenerate it; `is_customized` protects it from template edits). The reminder key
includes the start time, so a moved item is reminded again. The Move panel warns when the target day already
has the same template's own item.

**Minimum Day is honest.** Its checklist (a `Routine` of kind `minimum`) stands in for the morning routine
at the same weight; every other part still counts. A Minimum Day with its whole list done *holds* the
discipline streak (state `None`, like an untracked day) — at most 2 per week. Morning-routine lookups and
`/api/routines/` only ever see kind `morning`.

**Onboarding never catches existing users.** Migration `users/0006` marks every existing account as set up
(creating missing settings rows); the frontend redirects to `/welcome` only on an explicit `false`, so an
older server that doesn't send the flag during a deploy can't trigger it.

**Weekly insight is deterministic.** Finished days only; an area needs 2+ tracked days; workouts are judged
against the weekly target only once the week is over (or the target is met); one area is never both
strongest and weakest.

**Reminder status never pretends.** A test is sent to *this* device's endpoint and reports `this_device`;
a blocked permission is reported without calling the server.

**Non-shaming language** throughout: "Day in progress", "Not tracked today", half credit for late
wake-ups, "Can't do it now? Move it", encouraging empty states.

---

## 11. Testing and quality checks

```powershell
# Backend — 134 tests (models, ownership, scoring, max possible, streaks incl. Minimum Day, analytics and
# weekly insight, reminders, focus, moving items, onboarding, wake challenge)
cd backend
.venv\Scripts\python.exe manage.py test --noinput

# Frontend
cd frontend
npx tsc -b          # type-check
npm run lint        # oxlint
npm run build       # production build
```

Use `--noinput` so a leftover test database from a crashed run is replaced instead of prompting.
`core.testing.frozen_local_time` freezes "now" in the user's time zone for time-dependent tests.

Production settings can be checked locally:

```powershell
$env:DEBUG="False"; $env:SECRET_KEY="<long random string>"
.venv\Scripts\python.exe manage.py check --deploy
```

Each phase was also verified in a real browser at phone size, in light and dark mode
(forms, flows, offline shell, update prompt, push encryption end-to-end).

---

## 12. Day-to-day development workflow

The app is live, and every push to `main` deploys automatically
(Vercel for `frontend/`, Render for `backend/`). So treat `main` as production.

### Making a change

1. **Start both servers locally** (two terminals):

   ```powershell
   cd backend;  .venv\Scripts\python.exe manage.py runserver
   cd frontend; npm run dev
   ```

   Local development uses your **local** PostgreSQL and `frontend/.env`
   (`VITE_API_URL=http://localhost:8000/api`), never the live database.

2. **Make the change** following the existing patterns:
   - backend: model → serializer → view → `urls.py` → tests in the app's `tests.py`;
   - frontend: `modules/<feature>/api.ts` → `hooks.ts` → components → page.

3. **If you changed a model**, create the migration and commit it:

   ```powershell
   .venv\Scripts\python.exe manage.py makemigrations
   .venv\Scripts\python.exe manage.py migrate
   ```

   Render applies committed migrations to Neon during its next build.
   Prefer **additive** changes (new nullable fields or fields with defaults); the old code keeps
   running against the new schema for the minute the build takes.

4. **Check before pushing:**

   ```powershell
   cd backend;  .venv\Scripts\python.exe manage.py test --noinput
   cd frontend; npx tsc -b; npm run lint; npm run build
   ```

5. **Try it in the browser** at phone size (DevTools device mode), in light and dark mode.

6. **Commit and push:**

   ```powershell
   git add -A
   git commit -m "Short description of the change"
   git push
   ```

7. **Watch the deploy:** Vercel → Deployments, Render → Events. Then open the live app;
   installed phones show **Update available**.

### Bigger or risky changes

Work on a branch instead of `main`:

```powershell
git switch -c feature/my-change
# ...commit as usual...
git push -u origin feature/my-change
```

Vercel builds a **preview URL** for every branch, so you can try the frontend before merging.
(Previews call the live API, so the API's `CORS_ALLOWED_ORIGINS` would need the preview address
to log in there.) When happy, merge into `main`:

```powershell
git switch main
git merge feature/my-change
git push
```

### Adding a setting or secret

1. Read it in `backend/config/settings.py` with `env(...)` and a safe default.
2. Add it to `backend/.env.example` (no real value) and to your local `.env`.
3. On Render: add it under **Environment** (or in `render.yaml` with `sync: false` if it's secret).
4. Frontend settings must start with `VITE_`, are public, and need a Vercel **Redeploy** after changing.

### If a deploy breaks production

Roll back first (Render **Events → Rollback**, Vercel **Deployments → Instant Rollback**), then fix
locally and push again. Details are in the [Deployment Guide](DEPLOYMENT_GUIDE.md#11-logs-rollback-and-monitoring).

---

## 13. How it was developed

The system was built in 12 phases, each delivered as a backend commit (models, API, tests) followed
by a frontend commit (screens), and verified before moving on.

| Phase | Delivered |
|---|---|
| 1. Foundation | Django + React scaffold, PostgreSQL, email user model, JWT auth, settings, app shell |
| 2. Today system | Recurring schedule, tasks, Today dashboard, My Day views |
| 3. Habits | Habits with logs, streaks and week strip; morning routine |
| 4. Workout | Exercises, plans, live sessions with sets and rest timer, stats, history |
| 5. Goals | Goals with progress log, undo, auto status, main goal on Today |
| 6. Reflection | Night review with autosave and frozen day summary |
| 7. Discipline engine | Score components, daily scores, streaks, scoring settings |
| 8. Analytics | Progress charts, completion rates, weekly review with focus advice |
| 9. PWA | Installable app, offline shell, update prompt, icons |
| 10. Reminders | Web Push with VAPID, reminder preferences, background sender |
| 11. Wake-up challenge | Camera motion challenge, timer and math modes, scoring hook |
| 12. Deployment | Production settings, Render blueprint, Vercel config, deploy guide |

`git log` shows one or two commits per phase in this order.

**Usability round (after going live).** With the app in daily use, a second round made it simpler to use
every day — one improvement at a time, each tested in the browser at 320–430 px and confirmed before the next:

| # | Improvement | Migration |
|---|---|---|
| 1 | Simpler Today: NOW first, NEXT, compact plan, one-line summaries | — |
| 2 | Score breakdown with "You can still reach X today" | — |
| 3 | Move / Reschedule (later today, tomorrow, any date) | — |
| 4 | Night review → Prepare tomorrow → "Tomorrow is ready" | — |
| 5 | Today's Focus | `tasks/0002` (new table) |
| 6 | Quick Add and clearer terms ("Repeating") | — |
| 7 | First-time setup wizard | `users/0006` (flag + existing users marked done) |
| 8 | Honest reminder status and per-device test | — |
| 9 | Minimum Day | `planner/0003` (`Routine.kind`, new table) |
| 10 | Weekly insight ("This week" card) | — |
| 11 | Mobile polish from a full audit of every page and sheet | — |

Every migration only adds; nothing was renamed or removed, and existing data was preserved.

**Going live (Phase 12)** happened in this order:
1. production settings (gunicorn, whitenoise, HTTPS/HSTS, Neon pooler support), `render.yaml`
   and `vercel.json`;
2. the code pushed to GitHub;
3. Neon database (Singapore) → Render API (Singapore, from the blueprint, migrations at build)
   → Vercel app (root `frontend`, `VITE_API_URL`);
4. CORS connecting the two;
5. a final fix so copy-pasted origins with stray spaces or slashes still work.

Each step was checked from the outside (health check, HTTPS redirect, admin static files, the
built app containing the right API address, CORS headers). The step-by-step record is the
[Deployment Guide](DEPLOYMENT_GUIDE.md).

### Working method

- **Backend first, then frontend**, for every phase. Each phase ended green: all tests,
  type-check, lint and a browser walkthrough.
- **Small, focused commits** with a clear message, one or two per phase.
- **Secrets never in git:** `.env` is ignored, examples only. The history was scanned before the
  first push.
- **Real-device features** (push notifications, camera, install) were built with honest fallbacks
  for browsers that can't do them, then confirmed on a phone after deployment.

---

## 14. Known limitations and ideas

- **Free hosting:** Render sleeps without traffic (the reminder cron keeps it awake); Neon's free
  compute allowance should be watched — see the [Deployment Guide](DEPLOYMENT_GUIDE.md#12-free-plan-limits).
- **Push on iPhone** requires iOS 16.4+ and the app installed to the Home Screen.
- **Offline** covers the app shell only; changes can't be made without a connection.
- **Motion detection** measures movement, not specific exercises — it can't count squats.
- Ideas: offline queue for check-offs, data export, calendar sync, rep counting with a pose model.
