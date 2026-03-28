# Deployment Guide (Assignment Mode)

This project is configured for **assignment mode** by default:
- Admin pages are available without login using seeded default user `id=1`.
- Public booking pages are open to everyone.

Recommended hosting:
- Frontend: Vercel
- Backend: Render (Web Service)
- Database: MySQL (Render MySQL / Railway MySQL / PlanetScale / Aiven)

## 1. Prerequisites

- A MySQL database URL
- A Google OAuth web client ID (optional if you skip Google login)
- GitHub repository with this project

## 1A. Fast Local Deployment with Docker Compose

If you want full automation locally (DB + backend + frontend), run from repo root:

```bash
docker compose up --build
```

This starts:

- `db` (MySQL)
- `seed` (one-time sample data seeding)
- `backend` (Express API)
- `frontend` (Next.js app)

Endpoints:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

Stop stack:

```bash
docker compose down
```

Stop and remove DB volume:

```bash
docker compose down -v
```

## 2. Backend Deployment (Render)

Create a new **Web Service** from the `server` folder.

Build command:
```bash
npm install
```

Start command:
```bash
npm start
```

Environment variables:

- `PORT=4000`
- `DATABASE_URL=mysql://<user>:<pass>@<host>:<port>/<db>`
- `DEFAULT_TIMEZONE=Asia/Kolkata`
- `CORS_ORIGIN=https://<your-frontend-domain>`
- `JWT_SECRET=<long-random-secret>`
- `GOOGLE_CLIENT_ID=<google-oauth-web-client-id>`
- `ASSIGNMENT_MODE=true`
- `ASSIGNMENT_DEFAULT_USER_ID=1`
- `RUN_SEED_ON_STARTUP=false`

If your plan supports **Pre-Deploy Command**, set:
```bash
npm run seed
```

If Pre-Deploy Command is locked (free tier), use this fallback:

1. Set `RUN_SEED_ON_STARTUP=true` for one deploy.
2. Deploy once so seed runs automatically at container startup.
3. Set `RUN_SEED_ON_STARTUP=false` and deploy again (to avoid reseeding on every restart).

Health check endpoint:
- `GET /api/health`

## 3. Frontend Deployment (Vercel)

Import the `frontend` folder as a Vercel project.

Framework preset:
- Next.js

Build command:
```bash
npm run build
```

Environment variables:

- `NEXT_PUBLIC_API_BASE_URL=https://<your-backend-domain>`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google-oauth-web-client-id>`
- `NEXT_PUBLIC_ASSIGNMENT_MODE=true`

## 4. Post-Deploy Verification Checklist

1. Open `/` and confirm landing page loads.
2. Open `/dashboard` and confirm it opens without login (assignment mode).
3. Open `/availability` and save a small rule change.
4. Open a public event URL `/book/<slug>` and confirm slots load.
5. Complete a booking and verify confirmation page.
6. Try booking same slot again and confirm rejection.
7. Confirm backend `/api/health` returns `{ "ok": true }`.

## 5. If You Want Secure Mode Later

Switch both variables to disable assignment mode:

- Backend: `ASSIGNMENT_MODE=false`
- Frontend: `NEXT_PUBLIC_ASSIGNMENT_MODE=false`

Then redeploy frontend + backend.
