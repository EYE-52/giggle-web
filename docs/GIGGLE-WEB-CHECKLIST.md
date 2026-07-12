# Giggle Web Delivery Checklist

Last updated: 2026-07-12

Canonical repository: `/Users/divyansh/Projects/giggle-stack/giggle-web`

Local frontend URL: `http://localhost:4000`

Local backend default: `http://localhost:3001`

Design source of truth: `docs/superpowers/specs/2026-07-12-giggle-web-experience-design.md`

## Milestone 0: Baseline and Safety Rails

- [x] Confirm the standalone repository and Vercel configuration
- [x] Inventory routes, shared components, assets, workspace packages, and existing tests
- [x] Persist and commit the product/responsive experience design
- [x] Restore a clean generated `next-env.d.ts` state without overwriting user work
- [x] Run the existing unit tests and production build
- [x] Start the frontend against the configured backend
- [x] Capture baseline screenshots at 390x844, 768x1024, 1280x800, 1440x1100, and 1728x1117
- [x] Record console errors, failed requests, and layout overflow
- [x] Run automated blank-media pixel checks for landing video
- [x] Add Playwright browser coverage and screenshot directories

Baseline evidence from 2026-07-12:

- `pnpm test`: 91 passed
- `pnpm --filter @giggle/core test`: 25 passed
- `pnpm test:e2e e2e/landing.spec.ts`: 10 passed across five viewport projects
- `pnpm build`: passed, 19 static routes generated
- Frontend `http://localhost:4000`: HTTP 200 from this repository
- Backend `http://localhost:3001/api/stats`: HTTP 200
- Screenshots: `artifacts/visual-audit/2026-07-12/landing/*-baseline.png`
- Current shell warning: Node 25.6.1 is outside the repository's supported `>=20.18 <25` range; release verification must use the pinned `.node-version` runtime.

## Milestone 1: Public Landing

- [x] Keep the live squad-versus-squad product as the first viewport signal
- [x] Restore the scroll-driven three-use-case story: form squad, match by vibe, meet live
- [x] Use a curated pinned scrub sequence with a shorter phone scroll track
- [x] Reserve stable dimensions for hero and story media
- [x] Provide poster/fallback imagery for every active landing video
- [ ] Verify navigation, CTA, trust copy, privacy links, reduced motion, and keyboard access
- [ ] Remove visual effects that do not strengthen hierarchy or product understanding
- [x] Capture phone, tablet, laptop, desktop, wide-desktop, and reduced-motion evidence

Story evidence from 2026-07-12:

- Existing `DemoStage` retained; duplicate story components were deliberately not added.
- Scene-caption collision fixed by mounting exactly one active caption.
- Real poster frame added for slow media and reduced-motion users.
- Browser checks validate the expected title and nonblank decoded video pixels at all three scroll checkpoints.
- `pnpm test:e2e e2e/landing.spec.ts --grep "cinematic story"`: 6 passed, 4 intentionally skipped viewport duplicates.
- Complete landing browser gate: 16 passed, 4 intentionally skipped reduced-motion viewport duplicates.
- `pnpm build`: passed after the story repair; TypeScript clean and all 19 static routes generated.
- Screenshots: `artifacts/visual-audit/2026-07-12/landing-story/`.

## Milestone 2: Sign-In and Session Handoff

- [x] Keep one dominant OAuth action and concise data-use context
- [x] Verify referral-code preservation and safe callback routing
- [x] Add explicit loading, provider failure, backend failure, and retry states
- [x] Verify local dev sign-in without exposing a production bypass
- [x] Confirm authenticated users continue to the intended route
- [x] Capture phone, tablet, and desktop evidence

Authentication evidence from 2026-07-12:

- Google OAuth remains configured and is the dominant provider action; Apple remains secondary.
- A same-origin OAuth preflight keeps backend/provider-start failures retryable on the sign-in screen.
- Safe continuations are stored per tab through the redirect and validated again in the callback.
- Dev sign-in reaches the requested local route; protocol-relative/external continuations fall back to `/home`.
- `pnpm test:e2e e2e/signin.spec.ts`: 25 passed across five viewport projects.
- Screenshots: `artifacts/visual-audit/2026-07-12/signin/`.

## Milestone 3: Lobby

- [x] Put squad, readiness, device state, and the next action in the first viewport
- [ ] Explain camera/microphone intent before browser permission prompts
- [x] Keep invite, vibe, visibility, cover, and join-policy controls secondary
- [x] Make leader/member permissions and ready state unambiguous
- [ ] Preserve squad state through media errors and recoverable API failures
- [ ] Verify loading, missing squad, permission denied, disconnected, and retry states
- [x] Capture phone, tablet, desktop, and short-phone evidence

Lobby evidence from 2026-07-12:

- Matchmaking remains disabled with “Waiting for everyone” until all current members are ready.
- Starting matchmaking no longer silently changes the leader's ready state.
- Microphone and camera controls expose state through accessible names and `aria-pressed`.
- Readiness remains in the first viewport at 390x650, 390x844, tablet, laptop, desktop, and wide desktop sizes.
- `pnpm test:e2e e2e/lobby.spec.ts`: 5 standard viewport checks passed; short-phone check passed separately.
- Screenshots: `artifacts/visual-audit/2026-07-12/lobby/`.

## Milestone 4: Matchmaking and Match Confirmation

- [x] Show meaningful search stages instead of an indefinite spinner
- [x] Keep cancellation visible and safe
- [x] Preserve the squad when cancellation or polling fails
- [x] Deduplicate socket and polling match-found events
- [ ] Verify timeout, retry, cancellation, and match-found handoff
- [x] Capture phone, tablet, and desktop evidence

Matchmaking evidence from 2026-07-12:

- Queue status advances through active-squad checking, vibe matching, and strongest-live-match stages.
- Socket and polling events retain the existing single-reveal guard and timer cleanup.
- Failed cancellation keeps the squad queued, explains that state, and changes the action to `Try cancel again`.
- `pnpm test:e2e e2e/matchmaking.spec.ts`: 6 passed, 4 intentionally skipped duplicate recovery checks.
- Screenshots: `artifacts/visual-audit/2026-07-12/matchmaking/`.

## Milestone 5: Live Encounter

- [x] Make participant media the dominant surface
- [x] Keep call controls stable across resize, phone rotation, and safe areas
- [x] Make mute, camera, connection, participant departure, and ended states clear
- [x] Verify grid, versus, spotlight, and focused-participant modes
- [x] Verify reactions, chat, report, leave, and end-call permissions
- [x] Clean up media tracks, socket listeners, timers, and pending navigation
- [x] Run canvas/video pixel checks and confirm nonblank media frames
- [x] Capture phone, tablet, desktop, wide-desktop, and reduced-motion evidence

Encounter evidence from 2026-07-12:

- Browser automation creates two real users, squads, queues, and a shared encounter before testing the UI.
- Participant frames remain at usable dimensions in Versus, Grid, and Spotlight modes.
- The control toolbar exposes stable microphone, camera, and end-action names and state.
- Phone portrait and landscape, tablet, laptop, desktop, wide-desktop, and reduced-motion layouts pass.
- Frame screenshots are downsampled and checked for luminance range/non-dark pixel ratio, catching blank media surfaces.
- Ending the encounter performs backend cleanup and returns the leader to Home.
- Screenshots: `artifacts/visual-audit/2026-07-12/encounter/`.

## Milestone 6: Shared Product Experience

- [x] Curate authenticated navigation separately for phone, tablet, and desktop
- [x] Apply the visual system to Home, Discover, Friends, Profile, and Premium
- [x] Remove card/pill clutter and keep one primary action per state
- [ ] Standardize loading, empty, failure, offline, and success feedback
- [ ] Verify theme behavior, focus rings, touch targets, and text contrast

Navigation evidence from 2026-07-12:

- Phone uses a safe-area-aware four-destination bottom bar while theme and notifications remain in a quiet top utility bar.
- Tablet uses icon-first top navigation; laptop, desktop, and wide desktop use labeled top navigation.
- Active destinations expose `aria-current="page"`, and phone content reserves space for the fixed bar.
- `pnpm test:e2e e2e/navigation.spec.ts`: 5 passed.
- Screenshots: `artifacts/visual-audit/2026-07-12/navigation/`.

Product-route evidence from 2026-07-12:

- Home, Discover, Friends, Profile, and Wallet each expose a clear first task without horizontal overflow, console errors, or failed requests.
- Phone layouts keep primary actions and empty-state guidance above the fixed navigation; larger layouts constrain content instead of stretching cards across the viewport.
- Profile keeps chips only for direct multi-select preferences and identity choices; the remaining routes avoid decorative pill and card repetition.
- Wallet remains informational while payments are deferred and exposes no misleading buy, subscribe, or checkout action.
- `pnpm test:e2e e2e/product-routes.spec.ts`: 25 passed across five viewport projects.
- Screenshots: `artifacts/visual-audit/2026-07-12/product-routes/`.

## Milestone 7: Release Gate

- [ ] Run all unit and Playwright tests
- [ ] Run a clean production build from the standalone repository
- [ ] Verify production environment validation and OAuth rewrite behavior
- [ ] Review browser console errors and failed network requests
- [ ] Verify no horizontal overflow or overlapping controls at all target viewports
- [ ] Verify reduced motion and keyboard-only navigation
- [ ] Document final local URL, commands, screenshots, remaining risks, and deployment steps
- [ ] Mark the active goal complete only after every required gate has evidence

## Working Rules

- Update this file as checklist items are completed.
- Store visual evidence under `artifacts/visual-audit/YYYY-MM-DD/<route>/<viewport>.png`.
- Store important decisions in the design spec or the implementation plan, not only in chat.
- Do not overwrite unrelated worktree changes.
- Add no dependency when existing React, Next.js, browser APIs, or installed packages cover the requirement.
- Every non-trivial behavior change starts with a failing test and ends with fresh verification.
