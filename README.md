# giggle-web

Legacy frontend app for Giggle MVP Phase 1.

The production web app is `../giggle-app/apps/desktop`, deployed from `../giggle-app` with Vercel root directory `apps/desktop`. Do not use this folder for new product work or main production deploys unless you are intentionally maintaining the old Phase 1 surface.

## Run

1. Install dependencies

```bash
npm install
```

2. Configure environment variables

```bash
AUTH_SECRET=replace-me
AUTH_GOOGLE_ID=replace-me
AUTH_GOOGLE_SECRET=replace-me
AUTH_EXCHANGE_SECRET=replace-me
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com

# Backend server base URL
BACKEND_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

3. Start app

```bash
npm run dev
```

## Phase 1 Implemented Flow

- Google sign-in
- Auth session uses NextAuth JWT and exchanges the Google profile with `giggle-server` using `AUTH_EXCHANGE_SECRET`
- Create squad or join with code
- View squad members and ready states
- Join Agora squad lobby video
- Leader can start matchmaking state when all members are ready
- Lobby and encounter pages use the same landing-page-inspired visual palette for a consistent experience

## Backend Requirements

Make sure `giggle-server` is running with:

- squad APIs enabled
- Agora token endpoint: `POST /api/agora/lobby-token/:squadId`
- Agora env vars configured on backend (`AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`)
