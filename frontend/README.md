# Frontend (Next.js)

Scheduling platform frontend for the Scaler Cal.com clone assignment.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `frontend/.env.local` (if not already present):

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google-oauth-web-client-id>
NEXT_PUBLIC_ASSIGNMENT_MODE=false
```

3. Start dev server:

```bash
npm run dev
```

## Environment Variables

- `NEXT_PUBLIC_API_BASE_URL` -> backend base URL (for example `http://localhost:4000`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` -> Google OAuth web client ID
- `NEXT_PUBLIC_ASSIGNMENT_MODE` -> `false` for secure mode, `true` for assignment/demo mode

## Build

```bash
npm run lint
npm run build
```

For full deployment steps, see root `DEPLOYMENT.md`.
