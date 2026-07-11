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
- [ ] Restore a clean generated `next-env.d.ts` state without overwriting user work
- [ ] Run the existing unit tests and production build
- [ ] Start the frontend against the configured backend
- [ ] Capture baseline screenshots at 390x844, 768x1024, 1280x800, 1440x1100, and 1728x1117
- [ ] Record console errors, failed requests, layout overflow, and blank-media checks
- [ ] Add Playwright browser coverage and screenshot directories

## Milestone 1: Public Landing

- [ ] Keep the live squad-versus-squad product as the first viewport signal
- [ ] Restore the scroll-driven three-use-case story: form squad, meet squad, keep connection
- [ ] Use a pinned scrub sequence on desktop and sequential/swipe scenes on touch layouts
- [ ] Reserve stable dimensions for hero and story media
- [ ] Provide poster/fallback imagery for every video
- [ ] Verify navigation, CTA, trust copy, privacy links, reduced motion, and keyboard access
- [ ] Remove visual effects that do not strengthen hierarchy or product understanding
- [ ] Capture phone, tablet, laptop, desktop, wide-desktop, and reduced-motion evidence

## Milestone 2: Sign-In and Session Handoff

- [ ] Keep one dominant OAuth action and concise data-use context
- [ ] Verify referral-code preservation and safe callback routing
- [ ] Add explicit loading, provider failure, backend failure, and retry states
- [ ] Verify local dev sign-in without exposing a production bypass
- [ ] Confirm authenticated users continue to the intended route
- [ ] Capture phone, tablet, and desktop evidence

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

- [ ] Curate authenticated navigation separately for phone, tablet, and desktop
- [ ] Apply the visual system to Home, Discover, Friends, Profile, and Premium
- [ ] Remove card/pill clutter and keep one primary action per state
- [ ] Standardize loading, empty, failure, offline, and success feedback
- [ ] Verify theme behavior, focus rings, touch targets, and text contrast

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
