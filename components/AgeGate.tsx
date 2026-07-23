"use client";
import { useMemo, useState } from "react";
import { Logomark } from "@/components/Brand";
import { Button } from "@/components/Button";
import { session } from "@giggle/core";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Build a real Date and validate the parts round-trip (rejects e.g. Feb 30). */
function makeValidDate(year: number, month: number, day: number): Date | null {
  const d = new Date(year, month, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

/** Whole years between a birth date and now. */
function ageFromDate(birth: Date, now: Date): number {
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

const selectStyle: React.CSSProperties = {
  minHeight: 48,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontSize: 15,
  fontFamily: "inherit",
  cursor: "pointer",
  appearance: "auto",
};

/**
 * Blocking, full-screen onboarding step that collects a self-attested date of
 * birth. Not a dismissible modal — the app layout renders it in place of app
 * content until a DOB is set. On success it calls `session.setAge` and then
 * `onDone()` so the layout can re-render into the app.
 */
export function AgeGate({ onDone }: { onDone: () => void }) {
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const years = useMemo(
    () => Array.from({ length: 108 }, (_, i) => currentYear - 13 - i),
    [currentYear],
  );
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  const [month, setMonth] = useState<string>("");
  const [day, setDay] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooYoung, setTooYoung] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTooYoung(false);

    if (month === "" || day === "" || year === "") {
      setError("Please pick your full date of birth.");
      return;
    }

    const birth = makeValidDate(Number(year), Number(month), Number(day));
    if (!birth) {
      setError("That date doesn't look right — check the day and month.");
      return;
    }
    if (birth.getTime() > now.getTime()) {
      setError("That date is in the future — check your birth year.");
      return;
    }
    const age = ageFromDate(birth, now);
    if (age > 120) {
      setError("That date doesn't look right — check your birth year.");
      return;
    }
    if (age < 13) {
      setTooYoung(true);
      return;
    }

    // ISO YYYY-MM-DD (month is 0-indexed in state).
    const iso = `${birth.getFullYear()}-${String(birth.getMonth() + 1).padStart(2, "0")}-${String(birth.getDate()).padStart(2, "0")}`;
    setSubmitting(true);
    try {
      await session.setAge(iso);
      onDone();
    } catch (err) {
      // Backend may not ship /api/me/age yet (404) — don't trap the user in dev.
      // Surface a friendly message and let them retry.
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        // Already set server-side — treat as done.
        onDone();
        return;
      }
      setError(
        (err as { message?: string })?.message ||
          "Couldn't save that right now. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (tooYoung) {
    return (
      <Shell>
        <div style={{ fontSize: 40, lineHeight: 1 }} aria-hidden>
          🚧
        </div>
        <h1 style={headingStyle}>You must be at least 13 to use Giggle</h1>
        <p style={bodyStyle}>
          Thanks for your honesty. Giggle isn&apos;t available to anyone under 13.
          Come back when you&apos;re old enough — we&apos;ll be here.
        </p>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            setTooYoung(false);
            setError(null);
          }}
        >
          Go back
        </Button>
      </Shell>
    );
  }

  return (
    <Shell>
      <Logomark size={44} />
      <h1 style={headingStyle}>Confirm your age</h1>
      <p style={bodyStyle}>
        Giggle uses this to keep adult content away from minors. You must be 13+
        to use Giggle. We only store your date of birth — never shown to anyone
        else.
      </p>

      <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <legend style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", padding: 0, marginBottom: 2 }}>
            Date of birth
          </legend>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr 1.1fr", gap: 10 }}>
            <select
              aria-label="Birth month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={selectStyle}
            >
              <option value="" disabled>Month</option>
              {MONTHS.map((label, i) => (
                <option key={label} value={i}>{label}</option>
              ))}
            </select>
            <select
              aria-label="Birth day"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              style={selectStyle}
            >
              <option value="" disabled>Day</option>
              {days.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              aria-label="Birth year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              style={selectStyle}
            >
              <option value="" disabled>Year</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </fieldset>

        {error && (
          <div role="alert" style={{ fontSize: 13, color: "var(--coral, #FF5C5C)", lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" fullWidth loading={submitting}>
          Continue
        </Button>
      </form>
    </Shell>
  );
}

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display, var(--font-space-grotesk))",
  fontSize: 26,
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  color: "var(--text)",
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.55,
  color: "var(--text-muted)",
};

/** Full-screen, theme-aware, reduced-motion-safe container. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px 16px",
        background: "var(--bg)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm your age"
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 16,
          padding: "32px 26px",
          borderRadius: 22,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-card, var(--elev))",
          animation: "gg-reveal 0.32s var(--ease-out) both",
        }}
      >
        {children}
      </div>
    </div>
  );
}
