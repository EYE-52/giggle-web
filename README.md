# giggle-web

Frontend app for Giggle MVP Phase 1.

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

MONGODB_URI=mongodb://localhost:27017/giggle

# Backend server base URL
BACKEND_API_BASE_URL=http://localhost:3001
```

3. Start app

```bash
npm run dev
```

## Phase 1 Implemented Flow

- Google sign-in
- Create squad or join with code
- View squad members and ready states
- Join Agora squad lobby video
- Leader can start matchmaking state when all members are ready

## Backend Requirements

Make sure `giggle-server` is running with:

- squad APIs enabled
- Agora token endpoint: `POST /api/agora/lobby-token/:squadId`
- Agora env vars configured on backend (`AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`)
