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

- [ ] Put squad, readiness, device state, and the next action in the first viewport
- [ ] Explain camera/microphone intent before browser permission prompts
- [ ] Keep invite, vibe, visibility, cover, and join-policy controls secondary
- [ ] Make leader/member permissions and ready state unambiguous
- [ ] Preserve squad state through media errors and recoverable API failures
- [ ] Verify loading, missing squad, permission denied, disconnected, and retry states
- [ ] Capture phone, tablet, desktop, and short-phone evidence

## Milestone 4: Matchmaking and Match Confirmation

- [ ] Show meaningful search stages instead of an indefinite spinner
- [ ] Keep cancellation visible and safe
- [ ] Preserve the squad when cancellation or polling fails
- [ ] Deduplicate socket and polling match-found events
- [ ] Verify timeout, retry, cancellation, and match-found handoff
- [ ] Capture phone, tablet, and desktop evidence

## Milestone 5: Live Encounter

- [ ] Make participant media the dominant surface
- [ ] Keep call controls stable across resize, phone rotation, and safe areas
- [ ] Make mute, camera, connection, participant departure, and ended states clear
- [ ] Verify grid, versus, spotlight, and focused-participant modes
- [ ] Verify reactions, chat, report, leave, and end-call permissions
- [ ] Clean up media tracks, socket listeners, timers, and pending navigation
- [ ] Run canvas/video pixel checks and confirm nonblank media frames
- [ ] Capture phone, tablet, desktop, wide-desktop, and reduced-motion evidence

## Milestone 6: Shared Product Experience

- [x] Curate authenticated navigation separately for phone, tablet, and desktop
- [ ] Apply the visual system to Home, Discover, Friends, Profile, and Premium
- [ ] Remove card/pill clutter and keep one primary action per state
- [ ] Standardize loading, empty, failure, offline, and success feedback
- [ ] Verify theme behavior, focus rings, touch targets, and text contrast

Navigation evidence from 2026-07-12:

- Phone uses a safe-area-aware four-destination bottom bar while theme and notifications remain in a quiet top utility bar.
- Tablet uses icon-first top navigation; laptop, desktop, and wide desktop use labeled top navigation.
- Active destinations expose `aria-current="page"`, and phone content reserves space for the fixed bar.
- `pnpm test:e2e e2e/navigation.spec.ts`: 5 passed.
- Screenshots: `artifacts/visual-audit/2026-07-12/navigation/`.

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
