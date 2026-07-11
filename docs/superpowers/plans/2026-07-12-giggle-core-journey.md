# Giggle Core Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver and verify a production-grade Giggle journey from the public landing page through sign-in, lobby, matchmaking, match confirmation, and live encounter across all supported viewport classes.

**Architecture:** Preserve the existing Next.js 16 App Router, React 19, core API/session package, socket layer, and Agora client. Add browser-level contracts first, extract only the landing story and small call controls that benefit from isolation, and refine each existing route in place so realtime behavior is not rewritten during visual work.

**Tech Stack:** Next.js 16.2, React 19.2, TypeScript 5, CSS variables/native CSS, `@giggle/core`, `@giggle/agora`, Playwright.

---

## File Map

- `app/page.tsx`: public landing composition and existing cinematic media primitives
- `components/landing/UseCaseStory.tsx`: responsive three-use-case scroll/swipe sequence
- `components/landing/useStoryProgress.ts`: reduced-motion-aware desktop scroll progress
- `app/globals.css`: shared tokens, responsive story styles, safe-area and control primitives
- `app/signin/page.tsx`: OAuth entry, referral preservation, loading and failure states
- `app/(app)/layout.tsx`: authenticated shell and route-level session handoff
- `components/TopNav.tsx`: curated phone/tablet/desktop navigation
- `app/(app)/lobby/page.tsx`: squad readiness and device preparation
- `app/(app)/matchmaking/page.tsx`: search state, cancellation, deduplicated handoff
- `app/(app)/match/page.tsx`: match confirmation and expiry
- `app/(app)/encounter/page.tsx`: live participant layout and media lifecycle
- `components/call/CallControls.tsx`: stable, accessible call-control bar
- `playwright.config.ts`: production-like browser test runner and viewport projects
- `e2e/*.spec.ts`: user-journey, responsive, reduced-motion, and visual contracts
- `docs/GIGGLE-WEB-CHECKLIST.md`: persistent milestone status
- `artifacts/visual-audit/`: screenshot evidence

### Task 1: Establish Browser-Level Safety Rails

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `playwright.config.ts`
- Create: `e2e/landing.spec.ts`
- Modify: `app/page.tsx`
- Modify: `docs/GIGGLE-WEB-CHECKLIST.md`

- [x] **Step 1: Install the existing ecosystem's browser-test package**

Run:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Expected: `@playwright/test` appears in `devDependencies`, and Chromium installs successfully.

- [x] **Step 2: Add browser-test scripts**

Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:update": "playwright test --update-snapshots"
  }
}
```

- [x] **Step 3: Configure the five required viewport projects**

Create `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

const viewports = {
  phone: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  laptop: { width: 1280, height: 800 },
  desktop: { width: 1440, height: 1100 },
  wide: { width: 1728, height: 1117 },
};

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  outputDir: "artifacts/playwright-results",
  snapshotPathTemplate: "artifacts/playwright-snapshots/{testFilePath}/{arg}-{projectName}{ext}",
  use: {
    baseURL: "http://localhost:4000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:4000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: Object.entries(viewports).map(([name, viewport]) => ({
    name,
    use: { browserName: "chromium", viewport },
  })),
});
```

- [x] **Step 4: Write the first failing landing contract**

Create `e2e/landing.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("landing exposes the product and one primary start action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("giggle-hero")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /your squad.*their squad.*live/i })).toBeVisible();
  await expect(page.getByTestId("giggle-hero").getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/signin");
});
```

- [x] **Step 5: Run the test and confirm RED**

Run:

```bash
pnpm test:e2e --project=phone e2e/landing.spec.ts
```

Expected: FAIL because `giggle-hero` does not exist.

- [x] **Step 6: Mark the existing hero as the stable product surface**

In `app/page.tsx`, add the test id to the existing hero section:

```tsx
<section
  data-testid="giggle-hero"
  style={{ position: "relative", padding: `${isPhone ? 44 : 72}px ${pad}px ${isPhone ? 56 : 100}px` }}
>
```

- [x] **Step 7: Run the safety rails**

Run:

```bash
pnpm test
pnpm test:e2e --project=phone e2e/landing.spec.ts
pnpm build
```

Expected: all commands PASS.

- [x] **Step 8: Ignore generated evidence, keep curated screenshots**

Append to `.gitignore`:

```gitignore
artifacts/playwright-results/
artifacts/playwright-snapshots/
```

- [x] **Step 9: Mark Milestone 0 browser coverage complete and commit**

Update `docs/GIGGLE-WEB-CHECKLIST.md`, then run:

```bash
git add package.json pnpm-lock.yaml .gitignore playwright.config.ts e2e/landing.spec.ts app/page.tsx docs/GIGGLE-WEB-CHECKLIST.md
git commit -m "test: add Giggle responsive browser safety rails"
```

### Task 2: Restore the Three-Use-Case Scroll Story

**Files:**
- Create: `components/landing/useStoryProgress.ts`
- Create: `components/landing/UseCaseStory.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `e2e/landing.spec.ts`
- Modify: `docs/GIGGLE-WEB-CHECKLIST.md`

- [ ] **Step 1: Write the failing three-scene contract**

Add to `e2e/landing.spec.ts`:

```ts
test("landing reveals the three product use cases", async ({ page }, testInfo) => {
  await page.goto("/");
  const story = page.getByTestId("use-case-story");
  await expect(story).toBeVisible();
  await expect(story.getByRole("heading", { name: "Form your squad" })).toBeVisible();

  const titles = ["Form your squad", "Meet another squad", "Keep the connection"];
  for (let index = 0; index < titles.length; index += 1) {
    await story.evaluate((node, i) => {
      const section = node as HTMLElement;
      window.scrollTo({ top: section.offsetTop + section.offsetHeight * (Number(i) / 3), behavior: "instant" });
    }, index);
    await expect(story.getByRole("heading", { name: titles[index] })).toBeVisible();
  }

  await page.screenshot({
    path: `artifacts/visual-audit/2026-07-12/landing/${testInfo.project.name}-story.png`,
    fullPage: true,
  });
});
```

- [ ] **Step 2: Run the story test and confirm RED**

Run:

```bash
pnpm test:e2e --project=desktop e2e/landing.spec.ts
```

Expected: FAIL because `use-case-story` does not exist.

- [ ] **Step 3: Add the reduced-motion-aware progress hook**

Create `components/landing/useStoryProgress.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";

export function useStoryProgress(enabled: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(enabled ? 0 : 0.5);

  useEffect(() => {
    const section = ref.current;
    if (!section || !enabled) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const distance = Math.max(1, rect.height - window.innerHeight);
      setProgress(Math.min(1, Math.max(0, -rect.top / distance)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return { ref, progress };
}
```

- [ ] **Step 4: Create the responsive story component**

Create `components/landing/UseCaseStory.tsx` with these scene contracts:

```tsx
"use client";

import Image from "next/image";
import { useStoryProgress } from "./useStoryProgress";

const scenes = [
  { title: "Form your squad", copy: "Bring the people you already trust into one room.", image: "/landing/group1.jpg" },
  { title: "Meet another squad", copy: "Match by vibe and enter a live group encounter together.", image: "/landing/call1.jpg" },
  { title: "Keep the connection", copy: "Add the people you clicked with and meet again.", image: "/landing/group2.jpg" },
] as const;

export function UseCaseStory({ reducedMotion }: { reducedMotion: boolean }) {
  const { ref, progress } = useStoryProgress(!reducedMotion);
  const active = Math.min(scenes.length - 1, Math.floor(progress * scenes.length));

  return (
    <section ref={ref} data-testid="use-case-story" className="gg-story" aria-label="How Giggle works">
      <div className="gg-story__stage">
        {scenes.map((scene, index) => (
          <article
            key={scene.title}
            data-active={active === index}
            className="gg-story__scene"
            aria-hidden={active !== index && !reducedMotion}
          >
            <Image src={scene.image} alt="" fill sizes="(max-width: 1023px) 100vw, 70vw" />
            <div className="gg-story__scrim" />
            <div className="gg-story__copy">
              <span>0{index + 1}</span>
              <h2>{scene.title}</h2>
              <p>{scene.copy}</p>
            </div>
          </article>
        ))}
        <nav aria-label="Use cases" className="gg-story__steps">
          {scenes.map((scene, index) => <span key={scene.title} data-active={active === index}>{index + 1}</span>)}
        </nav>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Add the desktop pinned and touch sequential layouts**

In `app/globals.css`, add:

```css
.gg-story { position: relative; min-height: 300vh; background: #07070b; }
.gg-story__stage { position: sticky; top: 0; height: 100svh; overflow: hidden; }
.gg-story__scene { position: absolute; inset: 0; opacity: 0; transform: scale(1.035); transition: opacity .55s var(--ease-out), transform 1s var(--ease-out); }
.gg-story__scene[data-active="true"] { opacity: 1; transform: scale(1); }
.gg-story__scene img { object-fit: cover; }
.gg-story__scrim { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(7,7,11,.9) 0%, rgba(7,7,11,.35) 58%, rgba(7,7,11,.5) 100%); }
.gg-story__copy { position: absolute; left: max(6vw, 40px); bottom: 12vh; z-index: 2; max-width: 720px; }
.gg-story__copy span { color: var(--violet-bright); font-weight: 800; letter-spacing: .18em; }
.gg-story__copy h2 { margin-top: 18px; color: #fff; font: 700 clamp(48px, 7vw, 104px)/.92 var(--font-space-grotesk); letter-spacing: -.05em; }
.gg-story__copy p { margin-top: 22px; max-width: 520px; color: #c9c9da; font-size: clamp(17px, 1.5vw, 22px); line-height: 1.55; }
.gg-story__steps { position: absolute; right: max(4vw, 28px); bottom: 7vh; z-index: 3; display: flex; gap: 8px; }
.gg-story__steps span { width: 28px; height: 3px; overflow: hidden; border-radius: 4px; background: rgba(255,255,255,.28); color: transparent; }
.gg-story__steps span[data-active="true"] { background: var(--violet-bright); }

@media (max-width: 1023px) {
  .gg-story { min-height: auto; }
  .gg-story__stage { position: static; height: auto; }
  .gg-story__scene { position: relative; min-height: min(78svh, 720px); opacity: 1; transform: none; }
  .gg-story__scene + .gg-story__scene { border-top: 1px solid rgba(255,255,255,.1); }
  .gg-story__copy { left: 24px; right: 24px; bottom: 40px; }
  .gg-story__copy h2 { font-size: clamp(38px, 11vw, 64px); }
  .gg-story__steps { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .gg-story { min-height: auto; }
  .gg-story__stage { position: static; height: auto; }
  .gg-story__scene { position: relative; min-height: 72svh; opacity: 1; transform: none; transition: none; }
}
```

- [ ] **Step 6: Integrate the story after the trust bridge**

In `app/page.tsx`, import and render:

```tsx
import { UseCaseStory } from "@/components/landing/UseCaseStory";

// After the existing full-bleed hook band:
<UseCaseStory reducedMotion={reduce} />
```

Remove the older duplicate three-card `How it works` block after confirming the new story includes all three use cases. Keep the existing full-bleed demo only if it demonstrates a different product state.

- [ ] **Step 7: Verify all story modes**

Run:

```bash
pnpm test:e2e e2e/landing.spec.ts
pnpm build
```

Expected: all five viewport projects PASS; desktop uses a pinned sequence, phone/tablet show all scenes sequentially, and reduced motion shows all content without transforms.

- [ ] **Step 8: Update the checklist and commit**

```bash
git add components/landing app/page.tsx app/globals.css e2e/landing.spec.ts docs/GIGGLE-WEB-CHECKLIST.md
git commit -m "feat: restore Giggle three-use-case scroll story"
```

### Task 3: Curate Shared Navigation by Device Class

**Files:**
- Modify: `components/useViewport.ts`
- Modify: `components/TopNav.tsx`
- Modify: `app/(app)/layout.tsx`
- Create: `e2e/navigation.spec.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing navigation contracts**

Create `e2e/navigation.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("phone uses bottom navigation and desktop uses top navigation", async ({ page }, testInfo) => {
  await page.goto("/home");
  if (testInfo.project.name === "phone") {
    await expect(page.getByTestId("mobile-navigation")).toBeVisible();
    await expect(page.getByTestId("desktop-navigation")).toBeHidden();
  } else if (["desktop", "wide"].includes(testInfo.project.name)) {
    await expect(page.getByTestId("desktop-navigation")).toBeVisible();
    await expect(page.getByTestId("mobile-navigation")).toBeHidden();
  }
});
```

- [ ] **Step 2: Run the contract and confirm RED**

```bash
pnpm test:e2e e2e/navigation.spec.ts
```

Expected: FAIL because the current nav has no separate phone surface.

- [ ] **Step 3: Extend the viewport contract without adding a dependency**

Return these fields from `components/useViewport.ts`:

```ts
return {
  width,
  height,
  isPhone: width < 600,
  isTablet: width >= 600 && width < 1024,
  isDesktop: width >= 1024,
  isWide: width >= 1440,
  isNarrow: width < 1024,
};
```

- [ ] **Step 4: Render dedicated phone and desktop navigation surfaces**

In `components/TopNav.tsx`, keep the existing `NAV` source and render two nav elements:

```tsx
<nav data-testid="desktop-navigation" className="gg-desktop-nav" aria-label="Primary navigation">
  {/* Existing desktop links from NAV */}
</nav>

<nav data-testid="mobile-navigation" className="gg-mobile-nav" aria-label="Primary navigation">
  {NAV.map(({ href, label, icon: ItemIcon }) => (
    <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
      <ItemIcon size={20} color={path === href ? "var(--violet-bright)" : "var(--text-muted)"} />
      <span>{label}</span>
    </Link>
  ))}
</nav>
```

Add CSS that fixes `.gg-mobile-nav` to the safe-area-aware bottom edge below 600px and hides it otherwise. Hide `.gg-desktop-nav` below 1024px and keep the compact icon top nav for tablet.

- [ ] **Step 5: Protect page content from fixed navigation**

In `app/(app)/layout.tsx`, add `className="gg-app-main"` to `main`; in `app/globals.css`, add:

```css
@media (max-width: 599px) {
  .gg-app-main { padding-bottom: calc(92px + env(safe-area-inset-bottom)) !important; }
}
```

- [ ] **Step 6: Verify and commit**

```bash
pnpm test:e2e e2e/navigation.spec.ts
pnpm build
git add components/useViewport.ts components/TopNav.tsx app/'(app)'/layout.tsx app/globals.css e2e/navigation.spec.ts
git commit -m "feat: curate Giggle navigation by device class"
```

### Task 4: Make Sign-In and Session Handoff Trustworthy

**Files:**
- Modify: `app/signin/page.tsx`
- Modify: `app/auth/callback/page.tsx`
- Modify: `packages/core/src/session.ts`
- Create: `e2e/signin.spec.ts`
- Modify: `docs/GIGGLE-WEB-CHECKLIST.md`

- [ ] **Step 1: Write sign-in state contracts**

Create `e2e/signin.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("sign-in communicates purpose and keeps one primary provider action", async ({ page }) => {
  await page.goto("/signin?next=%2Flobby%3Fsquad%3Ddemo&ref=CREW42");
  await expect(page.getByRole("heading", { name: /join giggle/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  await expect(page.getByText(/name and email/i)).toBeVisible();
});

test("sign-in exposes provider failures as retryable alerts", async ({ page }) => {
  await page.route("**/api/auth/google**", route => route.abort("failed"));
  await page.goto("/signin");
  await page.getByRole("button", { name: /continue with google/i }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
pnpm test:e2e --project=phone e2e/signin.spec.ts
```

Expected: at least the failure-state test FAILS.

- [ ] **Step 3: Add a single retryable sign-in state machine**

In `app/signin/page.tsx`, use these explicit states:

```ts
type SignInStatus = "idle" | "redirecting" | "failed";
const [status, setStatus] = useState<SignInStatus>("idle");
const [error, setError] = useState("");
```

Set `redirecting` before constructing the OAuth URL. Catch URL/configuration failures, set `failed`, and render a `role="alert"` containing the backend-safe message plus a `Try again` button that restores `idle`.

- [ ] **Step 4: Preserve only safe same-site continuation paths**

Add this helper beside the sign-in component:

```ts
function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/home";
  return value;
}
```

Pass the encoded path through OAuth state using the existing session/auth mechanism; reject external paths in the callback before `router.replace`.

- [ ] **Step 5: Verify and commit**

```bash
pnpm test:e2e e2e/signin.spec.ts
pnpm --filter @giggle/core test
pnpm build
git add app/signin/page.tsx app/auth/callback/page.tsx packages/core/src/session.ts e2e/signin.spec.ts docs/GIGGLE-WEB-CHECKLIST.md
git commit -m "fix: make Giggle sign-in handoff explicit and retryable"
```

### Task 5: Put Lobby Readiness in the First Viewport

**Files:**
- Modify: `app/(app)/lobby/page.tsx`
- Modify: `app/globals.css`
- Create: `e2e/lobby.spec.ts`
- Modify: `docs/GIGGLE-WEB-CHECKLIST.md`

- [ ] **Step 1: Write the first-viewport lobby contract**

Create `e2e/lobby.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("lobby keeps readiness and the next action in the first viewport", async ({ page }) => {
  await page.goto("/lobby?squad=demo");
  const readiness = page.getByTestId("lobby-readiness");
  await expect(readiness).toBeVisible();
  await expect(readiness.getByRole("button", { name: /ready|find a squad/i })).toBeVisible();
  const box = await readiness.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(844 - 72);
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
pnpm test:e2e --project=phone e2e/lobby.spec.ts
```

Expected: FAIL because `lobby-readiness` does not exist.

- [ ] **Step 3: Mark and reorder the existing readiness surface**

In `app/(app)/lobby/page.tsx`, add `data-testid="lobby-readiness"` to the existing ready/match command region. On phone, render it immediately after the squad header and media preview. Move cover, visibility, join policy, invite administration, and vibe editing behind the existing settings/sidebar controls.

- [ ] **Step 4: Add explicit device and failure copy**

Render these state labels next to the existing camera and microphone controls:

```tsx
<span aria-live="polite">
  {videoError ? "Camera unavailable" : camOn ? "Camera on" : "Camera off"}
</span>
<span aria-live="polite">{micOn ? "Microphone on" : "Microphone muted"}</span>
```

Keep `matchError` in `role="alert"`, preserve the squad, and expose a retry button that calls the existing match-start handler.

- [ ] **Step 5: Verify phone, tablet, desktop, and short phone**

```bash
pnpm test:e2e e2e/lobby.spec.ts
pnpm build
```

Capture 390x844, 768x1024, 1280x800, and 390x650 evidence under `artifacts/visual-audit/2026-07-12/lobby/`.

- [ ] **Step 6: Update and commit**

```bash
git add app/'(app)'/lobby/page.tsx app/globals.css e2e/lobby.spec.ts docs/GIGGLE-WEB-CHECKLIST.md
git commit -m "feat: prioritize readiness in the Giggle lobby"
```

### Task 6: Make Matchmaking Progress and Recovery Explicit

**Files:**
- Modify: `app/(app)/matchmaking/page.tsx`
- Modify: `app/(app)/match/page.tsx`
- Create: `e2e/matchmaking.spec.ts`
- Modify: `docs/GIGGLE-WEB-CHECKLIST.md`

- [ ] **Step 1: Write progress, cancel, and deduplication contracts**

Create `e2e/matchmaking.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("matchmaking explains progress and keeps cancel available", async ({ page }) => {
  await page.goto("/matchmaking?squad=demo");
  await expect(page.getByRole("status")).toContainText(/checking active squads|matching vibes|opening encounter/i);
  await expect(page.getByRole("button", { name: /cancel search/i })).toBeVisible();
});

test("match confirmation keeps join and skip stable", async ({ page }) => {
  await page.goto("/match?squad=demo&enc=enc-demo");
  await expect(page.getByRole("button", { name: /join encounter/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /skip/i })).toBeVisible();
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
pnpm test:e2e --project=phone e2e/matchmaking.spec.ts
```

- [ ] **Step 3: Derive meaningful progress from elapsed time**

In `app/(app)/matchmaking/page.tsx`, add:

```ts
const progressLabel = elapsed < 4
  ? "Checking active squads"
  : elapsed < 10
  ? "Matching your squad's vibes"
  : "Finding the strongest live match";
```

Render it in an element with `role="status"` and `aria-live="polite"`. Keep the elapsed timer as secondary data.

- [ ] **Step 4: Preserve the existing single-reveal guard**

Keep `revealedRef` as the single source of truth for socket and polling events. Add a named helper that returns early when already revealed and ensure both event paths call only that helper.

- [ ] **Step 5: Make cancellation retryable without discarding squad state**

When `api.cancelSearch` fails, leave the page and squad intact, show `cancelError` with `role="alert"`, and change the same button label to `Try cancel again` after the failure.

- [ ] **Step 6: Verify timers and navigation cleanup**

Run:

```bash
pnpm test:e2e e2e/matchmaking.spec.ts
pnpm build
```

Expected: browser tests PASS with no duplicate navigation or timer warnings.

- [ ] **Step 7: Update and commit**

```bash
git add app/'(app)'/matchmaking/page.tsx app/'(app)'/match/page.tsx e2e/matchmaking.spec.ts docs/GIGGLE-WEB-CHECKLIST.md
git commit -m "feat: clarify Giggle matchmaking progress and recovery"
```

### Task 7: Stabilize Live Encounter Controls and Media States

**Files:**
- Create: `components/call/CallControls.tsx`
- Modify: `app/(app)/encounter/page.tsx`
- Modify: `app/globals.css`
- Create: `e2e/encounter.spec.ts`
- Modify: `docs/GIGGLE-WEB-CHECKLIST.md`

- [ ] **Step 1: Write control and layout contracts**

Create `e2e/encounter.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("encounter keeps participant media and controls visible", async ({ page }) => {
  await page.goto("/encounter?squad=demo&enc=enc-demo");
  await expect(page.getByTestId("encounter-stage")).toBeVisible();
  const controls = page.getByTestId("call-controls");
  await expect(controls).toBeVisible();
  await expect(controls.getByRole("button", { name: /mute microphone/i })).toBeVisible();
  await expect(controls.getByRole("button", { name: /turn camera off/i })).toBeVisible();
  await expect(controls.getByRole("button", { name: /leave|end encounter/i })).toBeVisible();
});

test("encounter does not render blank media frames", async ({ page }) => {
  await page.goto("/encounter?squad=demo&enc=enc-demo");
  const frames = page.locator("[data-media-frame]");
  await expect(frames.first()).toBeVisible();
  expect(await frames.count()).toBeGreaterThan(0);
  for (const frame of await frames.all()) {
    const box = await frame.boundingBox();
    expect(box?.width).toBeGreaterThan(80);
    expect(box?.height).toBeGreaterThan(80);
  }
});
```

- [ ] **Step 2: Run and confirm RED**

```bash
pnpm test:e2e --project=phone e2e/encounter.spec.ts
```

- [ ] **Step 3: Extract only the stable call-control surface**

Create `components/call/CallControls.tsx`:

```tsx
"use client";

type Props = {
  micOn: boolean;
  camOn: boolean;
  ending: boolean;
  isLeader: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onLeave: () => void;
};

export function CallControls(props: Props) {
  return (
    <div data-testid="call-controls" className="gg-call-controls" role="toolbar" aria-label="Encounter controls">
      <button type="button" onClick={props.onToggleMic} aria-label={props.micOn ? "Mute microphone" : "Unmute microphone"}>Mic</button>
      <button type="button" onClick={props.onToggleCam} aria-label={props.camOn ? "Turn camera off" : "Turn camera on"}>Camera</button>
      <button type="button" onClick={props.onLeave} disabled={props.ending} className="gg-call-controls__end">
        {props.ending ? "Ending" : props.isLeader ? "End encounter" : "Leave"}
      </button>
    </div>
  );
}
```

Keep icons from the existing route when integrating; the visible labels may remain visually hidden if the icon and tooltip are present.

- [ ] **Step 4: Add safe-area-aware stable control dimensions**

In `app/globals.css`, add:

```css
.gg-call-controls {
  position: fixed;
  left: 50%;
  bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 80;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 8px;
  border: 1px solid var(--border-strong);
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter: blur(18px);
  transform: translateX(-50%);
}
.gg-call-controls button { min-width: 46px; min-height: 46px; border-radius: 12px; }
.gg-call-controls__end { color: #fff; background: var(--coral); }
```

- [ ] **Step 5: Mark the stage and media frames**

In `app/(app)/encounter/page.tsx`, add `data-testid="encounter-stage"` to the active stage wrapper and `data-media-frame` to the existing participant-tile root. Preserve all current Agora refs and track lifecycle code.

- [ ] **Step 6: Verify interaction, resize, and reduced motion**

Run:

```bash
pnpm test:e2e e2e/encounter.spec.ts
pnpm build
```

Then capture phone portrait, phone landscape, tablet, desktop, wide desktop, and reduced-motion screenshots. Check the browser console and failed requests after mic/camera toggles, focus-mode changes, reactions, and leaving.

- [ ] **Step 7: Update and commit**

```bash
git add components/call/CallControls.tsx app/'(app)'/encounter/page.tsx app/globals.css e2e/encounter.spec.ts docs/GIGGLE-WEB-CHECKLIST.md
git commit -m "feat: stabilize Giggle encounter media and controls"
```

### Task 8: Apply the System to Secondary Routes

**Files:**
- Modify: `app/(app)/home/page.tsx`
- Modify: `app/(app)/discover/page.tsx`
- Modify: `app/(app)/friends/page.tsx`
- Modify: `app/(app)/profile/page.tsx`
- Modify: `app/(app)/premium/page.tsx`
- Create: `e2e/product-routes.spec.ts`
- Modify: `docs/GIGGLE-WEB-CHECKLIST.md`

- [ ] **Step 1: Write route-level first-action contracts**

Create `e2e/product-routes.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

const routes = [
  ["/home", /start|open|join/i],
  ["/discover", /discover|join/i],
  ["/friends", /invite|find/i],
  ["/profile", /edit profile/i],
] as const;

for (const [path, action] of routes) {
  test(`${path} exposes one clear first action`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main").getByRole("button", { name: action }).or(page.locator("main").getByRole("link", { name: action })).first()).toBeVisible();
  });
}
```

- [ ] **Step 2: Run and record failing routes**

```bash
pnpm test:e2e e2e/product-routes.spec.ts
```

- [ ] **Step 3: Refine one route at a time**

For each failing route, keep its existing data/API logic and apply these concrete rules:

```text
1. One h1 names the user's current task.
2. One primary action is visible before scrolling.
3. Repeated entities may be cards; page sections remain unframed.
4. Loading reserves final dimensions.
5. Empty and error states include one recovery command.
6. Phone layouts use 16px gutters and clear fixed navigation.
7. Tablet layouts never leave a pane narrower than 280px.
```

Run the single route's test after each route edit, then the full file.

- [ ] **Step 4: Keep Premium informational until payments are connected**

Do not add checkout. Keep plan comparison and entitlement explanation, and label unavailable purchase actions as `Coming soon` without presenting them as enabled controls.

- [ ] **Step 5: Verify and commit each route separately**

Use commits:

```bash
git commit -m "feat: refine Giggle home experience"
git commit -m "feat: refine Giggle discovery experience"
git commit -m "feat: refine Giggle friends experience"
git commit -m "feat: refine Giggle profile experience"
git commit -m "feat: refine Giggle premium information"
```

### Task 9: Run the Release Evidence Gate

**Files:**
- Modify: `docs/GIGGLE-WEB-CHECKLIST.md`
- Create: `docs/GIGGLE-WEB-HANDOFF.md`

- [ ] **Step 1: Run all automated checks from a clean install**

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm --filter @giggle/core test
pnpm test:e2e
pnpm build
```

Expected: every command exits 0.

- [ ] **Step 2: Run the local product stack**

```bash
pnpm dev
```

Expected frontend URL: `http://localhost:4000`.

Expected backend source: `NEXT_PUBLIC_BACKEND_URL` from `.env.local`, falling back to `http://localhost:3001` only in local development.

- [ ] **Step 3: Audit runtime evidence**

For landing, sign-in, lobby, matchmaking, match, encounter, home, discover, friends, profile, and premium:

```text
- Capture target viewport screenshots.
- Check console errors.
- Check failed network requests.
- Check horizontal overflow.
- Check text/control overlap.
- Check keyboard navigation.
- Check reduced motion.
- Check media frames for nonblank pixels.
```

- [ ] **Step 4: Write the operational handoff**

Create `docs/GIGGLE-WEB-HANDOFF.md` with:

```markdown
# Giggle Web Handoff

## Run Locally
## Required Environment
## Test Commands
## Production Build
## Route and Viewport Evidence
## Known Risks
## Deferred Work
## Deployment
```

Fill each section only with verified current-state evidence and exact commands.

- [ ] **Step 5: Close the persistent checklist**

Mark only evidence-backed items complete in `docs/GIGGLE-WEB-CHECKLIST.md`. Leave unsupported items unchecked.

- [ ] **Step 6: Commit the evidence and handoff**

```bash
git add docs/GIGGLE-WEB-CHECKLIST.md docs/GIGGLE-WEB-HANDOFF.md artifacts/visual-audit
git commit -m "docs: record Giggle web release evidence"
```
