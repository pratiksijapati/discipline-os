# Discipline OS

**Know what to do now — and make finishing it satisfying.**

Discipline OS is a mobile-first, installable web app for personal discipline. It brings your daily
schedule, tasks, habits, workouts, goals and a short night review into one place, and turns them
into a daily **discipline score** with streaks and progress charts.

**Live app:** https://discipline-os-omega.vercel.app

## Features

- **Today** — what's happening now and next, your plan, habits, tasks and live score in one screen
- **My Day** — repeating routine that fills every day automatically; today / tomorrow / week views
- **Tasks** — due dates, priorities, overdue and someday lists
- **Morning routine** — a daily checklist
- **Habits** — done/not-done, count or duration; daily, selected days or times per week; streaks
- **Workout** — plans, live sessions with sets and rest timer, stats and exercise history
- **Goals** — measurable goals with a progress log, undo and a main goal pinned to Today
- **Night review** — rate the day, reflect, and close it with a frozen summary
- **Discipline score** — 0–100 from only the parts you actually use, plus streaks
- **Progress** — score charts, completion rates, learning hours and a weekly review
- **Reminders** — Web Push notifications you control per type
- **Wake-up challenge** — move in front of the camera (processed on-device) or solve math to prove you're up
- **PWA** — install to your home screen, opens offline, light and dark themes

## Tech stack

React 19 · TypeScript · Vite · TanStack Query · vite-plugin-pwa —
Django 5.2 · Django REST Framework · SimpleJWT · PostgreSQL · Web Push (VAPID)

## Documentation

| Guide | For |
|---|---|
| [User Guide](docs/USER_GUIDE.md) | Using the app: every feature, step by step |
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | Architecture, local setup, API, design decisions, how it was built |
| [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) | Putting it online, updating it, logs, rollback, troubleshooting |

## Quick start (local)

```powershell
# Backend
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env        # fill in SECRET_KEY and DATABASE_URL
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py runserver

# Frontend (second terminal)
cd frontend
npm install
Copy-Item .env.example .env
npm run dev                        # http://localhost:5173
```

See the [Developer Guide](docs/DEVELOPER_GUIDE.md#5-local-setup) for PostgreSQL setup and details.

## Author

Pratik Sijapati
