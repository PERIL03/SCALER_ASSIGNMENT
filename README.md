# Scheduling Platform (Cal.com Clone)

This project is a beginner-friendly fullstack scheduling app built for the Scaler SDE Intern assignment.

## Tech Stack

- Frontend: Next.js (App Router)
- Backend: Node.js, Express
- Database: MySQL
- Date/Time: Luxon

## Features Implemented

### 1. Event Types Management
- Create event type (title, description, duration, slug)
- Edit event type
- Delete event type
- List event types on admin dashboard
- Public booking URL for each event type

### 2. Availability Settings
- Set timezone
- Set weekly day-based availability rules
- Multiple day/time rules supported

### 3. Public Booking Page
- Public page by slug (`/book/:slug`)
- Date selection
- Available slot list based on availability + existing bookings
- Booking form (name + email)
- Double booking prevention on backend using unique DB index
- Booking confirmation page

### 4. Bookings Dashboard
- Upcoming bookings
- Past bookings
- Cancel booking action

## Project Structure

```bash
SCALER/
  frontend/   # Next.js app (final submission frontend)
  server/     # Express API + MySQL scripts
```

Note: A duplicate legacy frontend was removed to keep the submission path clean.

## Setup Instructions

## Docker (One-Command Local Run)

If Docker is installed, you can run everything (MySQL + backend + frontend) with:

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- MySQL: localhost:3306

The compose setup runs the seed job automatically before the backend starts.

To stop:

```bash
docker compose down
```

To also delete DB volume data:

```bash
docker compose down -v
```

## 1) Database Setup (MySQL)

Create a MySQL database, for example:

```sql
CREATE DATABASE cal_clone;
```

## 2) Backend Setup

```bash
cd server
cp .env.example .env
```

Update `.env` values:

- `DATABASE_URL=mysql://<username>:<password>@localhost:3306/cal_clone`
- `PORT=4000`
- `DEFAULT_TIMEZONE=Asia/Kolkata`
- `CORS_ORIGIN=http://localhost:3000`
- `JWT_SECRET=<long-random-secret>`
- `GOOGLE_CLIENT_ID=<google-oauth-web-client-id>`

Run schema + seed:

```bash
npm run seed
```

Start backend:

```bash
npm run dev
```

## 3) Frontend Setup

In a new terminal:

```bash
cd frontend
npm run dev
```

Frontend default URL: `http://localhost:3000`

Backend default URL: `http://localhost:4000`

If needed, create `frontend/.env`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google-oauth-web-client-id>
```

## Testing

### Backend automated tests

The backend has integration and utility tests.

```bash
cd server
npm test
```

This runs:

- Database reseed before test run
- API integration tests for event type CRUD, availability, booking flow, double-booking protection, and cancellation
- Slot generation utility tests

### Frontend quality checks

```bash
cd frontend
npm run lint -- --max-warnings=0
npm run build
```

These ensure the frontend passes lint checks and production build.

## API Summary

### Admin APIs
- `POST /api/auth/google`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/event-types`
- `POST /api/event-types`
- `PUT /api/event-types/:id`
- `DELETE /api/event-types/:id`
- `GET /api/availability`
- `PUT /api/availability`
- `GET /api/bookings?scope=upcoming|past`
- `POST /api/bookings/:id/cancel`

### Public APIs
- `GET /api/public/:slug`
- `GET /api/public/:slug/slots?date=YYYY-MM-DD`
- `POST /api/public/:slug/book`
- `GET /api/public/bookings/:id`

## Assumptions

- Assignment mode is enabled by default (`ASSIGNMENT_MODE=true`), so admin pages work without login by using seeded default user `id=1`.
- If you want secure/authenticated admin mode, set `ASSIGNMENT_MODE=false` in `server/.env` and `NEXT_PUBLIC_ASSIGNMENT_MODE=false` in `frontend/.env`.
- Google login creates/updates user profile using Google email and stores session in HTTP-only cookie.
- Bookings are blocked from double-booking the same event type and time slot.
- Availability is configured for the default user and applied to all their event types.

## Notes for Interview Explanation

- Database schema is normalized with clear relationships (`users -> event_types`, `users -> availability_rules`, `event_types -> bookings`).
- Slot generation is done on backend so business logic remains secure and consistent.
- Public booking flow re-validates slot availability on backend before creating a booking.
- Code is intentionally written in simple, readable modules for fresher-level explanation.
