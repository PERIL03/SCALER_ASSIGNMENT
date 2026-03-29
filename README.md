# SCALER Scheduling Platform (Cal.com-Inspired)

Fullstack scheduling app built for the Scaler SDE Intern assignment.

## Tech Stack

- Frontend: Next.js (App Router), React
- Backend: Node.js, Express
- Database: MySQL
- Auth: JWT cookie sessions + Google OAuth + Email/Password
- Validation/Time: Zod, Luxon

## Repository Structure

```bash
SCALER/
  frontend/          # Next.js application
  server/            # Express API, seed, tests, SQL schema
  docker-compose.yml # Local full-stack orchestration
  DEPLOYMENT.md      # Deployment notes
```

## Current Product Behavior

### Authentication and Account Flow

- Single auth entry on landing page: `SIGN IN / SIGN UP` routes to `/signup`
- `/signup` supports:
  - Email sign up / sign in
  - Google OAuth
  - Admin-required mode handling
- Email verification and onboarding are enforced before protected workflows
- Session uses HTTP-only auth cookie with cross-site support in production

### Roles and Access

- Admin-only:
  - Event types management
  - Availability management
  - Admin dashboard routes
- Regular user:
  - User booking page
  - Own bookings visibility (active/past)
  - Cannot manage admin resources

### Booking Experience

- User booking page (`/book/:slug`) includes:
  - Left panel: `My Bookings` with `Active` and `Previous` tabs (user-scoped)
  - Right panel: quick booking card (date + time dropdown + identity fields)
- Backend prevents double booking via validation + DB uniqueness constraints
- Booking confirmation route: `/booking-confirmation/:bookingId`

### UI/UX Enhancements Included

- Compact profile pill + dropdown in navbar
- Global toast notifications for auth redirects and status feedback
- Clear handling for admin-required redirects when signed in as a regular user

## Local Setup

## Option A: Docker (Recommended for quick local run)

From repo root:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- MySQL: `localhost:3306`

Stop:

```bash
docker compose down
```

Remove DB volume as well:

```bash
docker compose down -v
```

## Option B: Manual setup

### 1) Database

Create DB:

```sql
CREATE DATABASE cal_clone;
```

### 2) Backend

```bash
cd server
cp .env.example .env
npm install
npm run seed
npm run dev
```

Default backend URL: `http://localhost:4000`

### 3) Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Default frontend URL: `http://localhost:3000`

Create `frontend/.env.local` if needed:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google-oauth-web-client-id>
NEXT_PUBLIC_ASSIGNMENT_MODE=false
```

## Important Environment Variables

### Backend (`server/.env`)

- `PORT` (default `4000`)
- `DATABASE_URL` (MySQL connection URL)
- `DEFAULT_TIMEZONE` (default `Asia/Kolkata`)
- `CORS_ORIGIN` (comma-separated allowed frontend origins)
- `JWT_SECRET` (required in real deployments)
- `GOOGLE_CLIENT_ID` (required for Google OAuth)
- `ASSIGNMENT_DEFAULT_USER_ID` (admin fallback id, default `1`)
- `ADMIN_EMAILS` (optional comma-separated admin email list)
- `ALLOW_VERCEL_PREVIEW_ORIGINS` (`true/false`, preview CORS fallback)

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_ASSIGNMENT_MODE`

## Testing and Quality Checks

### Backend tests

```bash
cd server
npm test
```

### Frontend checks

```bash
cd frontend
npm run lint
npm run build
```

## API Snapshot

### Auth

- `POST /api/auth/email-signup`
- `POST /api/auth/email-signin`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `POST /api/auth/send-verification`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/logout`

### Admin-protected resources

- `GET|POST|PUT|DELETE /api/event-types...`
- `GET|PUT /api/availability`

### User bookings

- `GET /api/bookings?scope=upcoming|past`
- `POST /api/bookings/:id/cancel`

### Booking routes used by frontend user booking flow

- `GET /api/public/:slug`
- `GET /api/public/:slug/slots?date=YYYY-MM-DD`
- `POST /api/public/:slug/book`
- `GET /api/public/bookings/:id`

Note: In this project version, `/api/public/*` routes are login-protected by backend middleware.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment steps.

## Demo Admin Credentials (Assignment)

- Email: `admin@calclone.dev`
- Password: `Admin@1234`

For real deployments, replace hardcoded/admin-demo behavior with env-managed secrets and role records.
