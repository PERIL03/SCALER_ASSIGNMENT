# Frontend (Next.js)

Scheduling platform frontend for the Scaler Cal.com clone assignment.

## Local Setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Start dev server:

```bash
npm run dev
```

## Environment Variables

- `NEXT_PUBLIC_API_BASE_URL` -> backend base URL (for example `http://localhost:4000`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` -> Google OAuth web client ID
- `NEXT_PUBLIC_ASSIGNMENT_MODE` -> keep `true` for assignment mode behavior

## Build

```bash
npm run lint
npm run build
```

For full deployment steps, see root `DEPLOYMENT.md`.
