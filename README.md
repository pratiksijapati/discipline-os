# Discipline OS

**Know what to do now — and make finishing it satisfying.**

Discipline OS is a mobile-first, installable web app for personal discipline. It brings your daily
schedule, tasks, habits, workouts, goals and a short night review into one place, and turns them
into a daily **discipline score** with streaks and progress charts.

**Live app:** https://discipline-os-omega.vercel.app

## Features

- **Today** — NOW (what to do right now), NEXT, a compact plan and one-line summaries
- **Today's Focus** — the one important thing for the day
- **Quick Add** — one + for schedule, task, habit or goal, with plain explanations
- **My Day** — today / tomorrow / week, a repeating plan that fills every day, and **Move** for missed items
- **Tasks, Morning routine, Habits, Workout, Goals** — logging made quick, with streaks and history
- **Night review → Prepare tomorrow** — close the day, then get tomorrow ready
- **Discipline score** — 0–100 from only the parts you use, with "you can still reach X today"
- **Minimum Day** — a smaller, honest set of commitments for hard days that keeps your streak
- **Progress** — charts, completion rates and a weekly "This week" insight
- **Wake-up challenge** — move in front of the camera (processed on-device) or solve math
- **Reminders** — Web Push with an honest per-device status
- **First-time setup** — a short wizard builds your system in a few minutes
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
