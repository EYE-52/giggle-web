"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logomark } from "@/components/Brand";
import { AvatarArt } from "@/components/AvatarArt";
import { Icon } from "@/components/Icons";
import { api, connectSocket, SOCKET_EVENTS, session, getMyAvatar, subscribeAvatar, DEFAULT_AVATAR_ID } from "@giggle/core";
import type { SquadState } from "@giggle/core";
import { useViewport } from "@/components/useViewport";
import { Button } from "@/components/Button";
import { StatTile } from "@/components/StatTile";

function MatchmakingInner() {
  const { height, isPhone } = useViewport();
  const isShortPhone = isPhone && height <= 650;
  const router = useRouter();
  const params = useSearchParams();
  const squadId = params.get("squad") ?? "";

  const [elapsed, setElapsed] = useState(0);
  const [squad, setSquad] = useState<SquadState | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [matchFound, setMatchFound] = useState<{ encounterId: string; opponentName?: string } | null>(null);
  const [matchVisible, setMatchVisible] = useState(false);
  // Consecutive matchStatus poll failures — after ≥3 we surface a reconnect note.
  const [pollFailures, setPollFailures] = useState(0);
  const pollFailuresRef = useRef(0);
  // getSquad failed even after one auto-retry — offer a manual retry link.
  const [squadError, setSquadError] = useState(false);
  // Long-search branch card: shown when (elapsed - baseline) ≥ 75s of searching.
  // "Keep waiting" bumps the baseline so the card returns after another 75s.
  const [longSearchBaseline, setLongSearchBaseline] = useState(0);
  const showLongSearch = !matchFound && elapsed - longSearchBaseline >= 75;
  // Both the socket event and the 2s poll can fire — ensure we reveal/navigate once.
  const revealedRef = useRef(false);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // getSquad silent auto-retry timer — cleared on unmount so the retry can't
  // setState after the page is gone.
  const squadRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearRevealTimers() {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  }

  // Local user's chosen avatar (SSR-safe: read after mount)
  const [myAvatar, setMyAvatar] = useState<string>(DEFAULT_AVATAR_ID);
  useEffect(() => {
    setMyAvatar(getMyAvatar());
    return subscribeAvatar((v) => setMyAvatar(v));
  }, []);

  const violet = "var(--accent, var(--violet))";
  const lime = "var(--lime)";
  const limeText = "var(--lime-text)";
  const textPrimary = "var(--text)";
  const textMuted = "var(--text-muted)";


  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const progressLabel = elapsed < 4
    ? "Checking active squads"
    : elapsed < 10
      ? "Matching your squad's vibes"
      : "Finding the strongest live match";

  useEffect(() => {
    if (!squadId) return;

    // Load squad; on failure attempt one silent auto-retry before surfacing "?".
    fetchSquad(true);

    const tick = setInterval(() => setElapsed(e => e + 1), 1000);

    const pollInterval = setInterval(async () => {
      try {
        const status = await api.matchStatus(squadId);
        // Poll succeeded — recover silently from any reconnect state.
        if (pollFailuresRef.current > 0) {
          pollFailuresRef.current = 0;
          setPollFailures(0);
        }
        if (status.state === "matched" && status.match) {
          clearInterval(pollInterval);
          triggerMatchReveal(status.match.encounterId);
        }
      } catch {
        pollFailuresRef.current += 1;
        setPollFailures(pollFailuresRef.current);
      }
    }, 2000);

    const socket = connectSocket(squadId);
    const onMatchFound = ({ encounterId, opponentSquadName }: { encounterId: string; opponentSquadName?: string }) => {
      clearInterval(pollInterval);
      triggerMatchReveal(encounterId, opponentSquadName);
    };
    socket.on(SOCKET_EVENTS.MATCH_FOUND, onMatchFound);

    return () => {
      clearInterval(tick);
      clearInterval(pollInterval);
      clearRevealTimers();
      if (squadRetryTimeoutRef.current) {
        clearTimeout(squadRetryTimeoutRef.current);
        squadRetryTimeoutRef.current = null;
      }
      socket.off(SOCKET_EVENTS.MATCH_FOUND, onMatchFound);
    };
  }, [squadId, router]);

  function fetchSquad(autoRetry = false) {
    setSquadError(false);
    api.getSquad(squadId).then(s => {
      setSquad(s);
      setSquadError(false);
    }).catch(() => {
      if (autoRetry) {
        // One silent auto-retry before showing the "?" + retry link.
        squadRetryTimeoutRef.current = setTimeout(() => fetchSquad(false), 1500);
      } else {
        setSquadError(true);
      }
    });
  }

  function triggerMatchReveal(encounterId: string, opponentName?: string) {
    if (revealedRef.current) return;
    revealedRef.current = true;
    clearRevealTimers();
    setMatchFound({ encounterId, opponentName });
    // Brief mount delay so the animation plays
    revealTimeoutRef.current = setTimeout(() => setMatchVisible(true), 30);
    // Navigate after reveal (~2s — leaves time for the SR announcement to land)
    navigationTimeoutRef.current = setTimeout(() => {
      router.push(`/match?squad=${squadId}&enc=${encounterId}`);
    }, 2000);
  }

  async function handleCancel() {
    // No cancelling once the match reveal/navigation has started.
    if (!squadId || cancelling || revealedRef.current) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await api.cancelSearch(squadId);
    } catch {
      setCancelError("Couldn't cancel search. Your squad is still in the queue.");
      setCancelling(false);
      return;
    }
    router.push(`/lobby?squad=${squadId}`);
  }

  const members = squad?.members ?? [];
  // Orbit tokens for the radar — cap at 4 so they stay evenly spaced and uncrowded.
  const orbitTokens = members.slice(0, 4).map((m, i) => ({
    key: m.memberId ?? `${m.displayName}-${i}`,
    name: m.displayName,
    isMe: session.user?.id ? m.userId === session.user.id : i === 0,
    colorIndex: i,
  }));

  if (!squadId) {
    return (
      <div data-theme="dark" style={{ height: "100%", display: "grid", placeItems: "center", background: "#0B0B0F", padding: 24 }}>
        <div style={{ width: "min(460px, 100%)", background: "linear-gradient(145deg, #1a1228 0%, #0e0e18 100%)", border: "1.5px solid rgba(124,92,255,0.38)", borderRadius: 24, padding: isPhone ? 24 : 32, textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.55)" }}>
          <div style={{ width: 58, height: 58, borderRadius: 18, margin: "0 auto 16px", display: "grid", placeItems: "center", background: "rgba(124,92,255,0.14)", border: "1px solid rgba(124,92,255,0.3)" }}>
            <Icon.discover size={25} color="var(--lime)" />
          </div>
          <h1 style={{ margin: 0, color: textPrimary, fontFamily: "var(--font-display, var(--font-space-grotesk))", fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>No squad selected</h1>
          <p style={{ margin: "10px 0 22px", color: textMuted, lineHeight: 1.5, fontSize: 14 }}>Start matchmaking from a squad lobby so we know who to pair you with.</p>
          <Button onClick={() => router.push("/home")} variant="primary">Back to home</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes radarPulse {
          0% { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes breatheGlow {
          0%, 100% { box-shadow: 0 0 32px -4px #7C5CFF, 0 0 0px #7C5CFF; }
          50% { box-shadow: 0 0 52px 2px #7C5CFF, 0 0 80px -10px #7C5CFF55; }
        }
        @keyframes centerFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes sweepSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ripple {
          0% { transform: scale(0.35); opacity: 0; }
          12% { opacity: 0.7; }
          100% { transform: scale(1); opacity: 0; }
        }
        /* Orbits: wrapper spins, avatar counter-spins to stay upright */
        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbitSpinR {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes orbResolve {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(194,255,61,0.55); }
          50% { opacity: 0.55; box-shadow: 0 0 0 5px rgba(194,255,61,0); }
        }
        @keyframes matchRevealBg {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes matchRevealCard {
          0% { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
          55% { transform: translate(-50%, -50%) scale(1.04); opacity: 1; }
          80% { transform: translate(-50%, -50%) scale(0.98); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes opponentSlideIn {
          from { transform: translateY(28px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        /* ── PREMIUM MICRO-INTERACTION SPEC (shared) ── */
        [data-theme="dark"] button:not(:disabled) {
          -webkit-tap-highlight-color: transparent;
          transition: transform .14s cubic-bezier(.22,1,.36,1), box-shadow .2s cubic-bezier(.4,0,.2,1), background .2s cubic-bezier(.4,0,.2,1), color .2s cubic-bezier(.4,0,.2,1), border-color .2s cubic-bezier(.4,0,.2,1), filter .2s cubic-bezier(.4,0,.2,1);
        }
        [data-theme="dark"] button:not(:disabled):active {
          transform: scale(.94) !important;
          transition-duration: .06s;
        }
        [data-theme="dark"] button:disabled { cursor: not-allowed; }
        [data-theme="dark"] button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px #0B0B0F, 0 0 0 4px var(--violet, #7C5CFF);
        }
        @media (prefers-reduced-motion: reduce) {
          [data-theme="dark"] *,
          [data-theme="dark"] *::before,
          [data-theme="dark"] *::after {
            animation-duration: .001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .001ms !important;
          }
          [data-theme="dark"] button:not(:disabled):active { transform: none !important; }
        }
      `}</style>

      {/* Match-found overlay */}
      {matchFound && (
        <div role="status" aria-live="assertive" style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(11,11,15,0.82)",
          backdropFilter: "blur(12px)",
          animation: "matchRevealBg 0.35s ease",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* SR announcement — visually hidden, read via the aria-live overlay */}
          <span style={{
            position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
            overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" as const, border: 0,
          }}>Match found — starting now.</span>
          <div aria-hidden style={{
            position: "absolute", top: "50%", left: "50%",
            animation: matchVisible ? "matchRevealCard 0.65s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
            background: "linear-gradient(145deg, #1a1228 0%, #0e0e18 100%)",
            border: "1.5px solid rgba(124,92,255,0.53)",
            borderRadius: 28,
            padding: isPhone ? "28px 24px" : "40px 48px",
            textAlign: "center",
            boxShadow: "0 0 80px -16px #7C5CFF, 0 24px 64px rgba(0,0,0,0.6)",
            minWidth: isPhone ? "calc(100vw - 48px)" : 320,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
          }}>
            {/* Shimmer badge */}
            <div style={{
              background: "linear-gradient(90deg, rgba(124,92,255,0.2), rgba(124,92,255,0.6), rgba(194,255,61,0.53), rgba(124,92,255,0.6), rgba(124,92,255,0.2))",
              backgroundSize: "200% auto",
              animation: "shimmer 1.4s linear infinite",
              borderRadius: 999,
              padding: "6px 20px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
              color: "#fff",
            }}>Match Found</div>

            <div style={{
              fontFamily: "var(--font-display, var(--font-space-grotesk))",
              fontSize: isPhone ? 22 : 30, fontWeight: 700, color: "#F4F4F7",
              letterSpacing: "-0.03em", lineHeight: 1.1,
            }}>Squad located!</div>

            {matchFound.opponentName && (
              <div style={{
                animation: "opponentSlideIn 0.5s 0.4s both",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              }}>
                <div style={{ color: "#9A9AB0", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>You matched with</div>
                <div style={{
                  fontFamily: "var(--font-display, var(--font-space-grotesk))",
                  fontSize: 22, fontWeight: 700, color: "var(--lime-text, #C2FF3D)",
                }}>{matchFound.opponentName}</div>
              </div>
            )}

            <div style={{
              color: "#9A9AB0", fontSize: 14,
              animation: "opponentSlideIn 0.5s 0.6s both",
            }}>Heading to the encounter…</div>

            {/* Animated dots */}
            <div style={{ display: "flex", gap: 6, animation: "opponentSlideIn 0.4s 0.8s both" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#7C5CFF",
                  animation: `radarPulse 1.2s ${i * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div data-theme="dark" style={{
        height: "100%",
        minHeight: 0,
        width: "100%",
        background: "#0B0B0F",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: isShortPhone ? 10 : isPhone ? 18 : 28,
        padding: isShortPhone ? "10px 16px" : isPhone ? "20px 16px" : "24px",
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
      }}>
        {/* ── RADAR HERO — the centerpiece. A fixed, self-contained square so the
            orbiting avatars stay strictly INSIDE it and never collide with the
            title below. Everything else is arranged around this. ── */}
        {(() => {
          const dim = isShortPhone ? 190 : isPhone ? 244 : 380;
          const sweepSize = isShortPhone ? 132 : isPhone ? 168 : 264;     // conic beam disc
          const tokenSize = isShortPhone ? 30 : isPhone ? 34 : 44;
          // Orbit radius kept well inside the square: orbitR + token/2 < dim/2.
          const orbitR = isShortPhone ? 70 : isPhone ? 92 : 148;
          const tokens = orbitTokens.length ? orbitTokens : [{ key: "me", name: "You", isMe: true, colorIndex: 0 }];
          const tokenGrads = [
            "linear-gradient(145deg,#7C5CFF,#5B3FD4)",
            "linear-gradient(145deg,#3DD6C0,#1FA89A)",
            "linear-gradient(145deg,#C2FF3D,#7FA81E)",
            "linear-gradient(145deg,#FF8A5C,#E0633A)",
          ];
          return (
        <div style={{ position: "relative", zIndex: 1, flexShrink: 0, width: dim, height: dim, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Rippling concentric rings — expand + fade outward on a stagger */}
          {[0, 1].map(i => (
            <div key={`r${i}`} style={{
              position: "absolute", width: dim, height: dim, borderRadius: "50%",
              border: "1.5px solid rgba(124,92,255,0.45)",
              animation: `ripple 3.6s ease-out ${i * 1.8}s infinite`,
            }} />
          ))}

          {/* Rotating conic-gradient SWEEP beam (the radar scan) */}
          <div style={{
            position: "absolute", width: sweepSize, height: sweepSize, borderRadius: "50%",
            background: "conic-gradient(from 0deg, rgba(124,92,255,0) 0deg, rgba(124,92,255,0) 270deg, rgba(124,92,255,0.10) 320deg, rgba(124,92,255,0.45) 352deg, rgba(194,255,61,0.55) 360deg)",
            animation: "sweepSpin 3.6s linear infinite",
            maskImage: "radial-gradient(circle, #000 62%, transparent 63%)",
            WebkitMaskImage: "radial-gradient(circle, #000 62%, transparent 63%)",
          }} />

          {/* Rotating dashed ring */}
          <div style={{
            position: "absolute", width: isShortPhone ? 120 : isPhone ? 156 : 248, height: isShortPhone ? 120 : isPhone ? 156 : 248, borderRadius: "50%",
            border: "2px dashed rgba(124,92,255,0.33)",
            animation: "rotateSlow 9s linear infinite",
          }} />
          {/* Center: Giggle logomark — breathing glow + gentle float */}
          <div style={{ position: "relative", zIndex: 3, animation: "centerFloat 4.5s ease-in-out infinite" }}>
            <div style={{
              width: isShortPhone ? 54 : isPhone ? 64 : 100, height: isShortPhone ? 54 : isPhone ? 64 : 100, borderRadius: "50%",
              background: "radial-gradient(circle at 50% 38%, #1a1330 0%, #0e0e18 100%)",
              border: `2px solid ${violet}`,
              animation: "breatheGlow 2.8s ease-in-out infinite",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Logomark size={isShortPhone ? 30 : isPhone ? 36 : 54} />
            </div>
          </div>

          {/* Orbiting squad avatars — real tokens (your AvatarArt; teammates get a
              polished gradient token with a person glyph, never a bare initial).
              The lane wrapper spins; the token counter-spins to stay upright. */}
          {tokens.map((t, i) => {
            const n = tokens.length;
            const dur = 20 + i * 4;
            return (
              <div key={t.key} aria-hidden style={{
                position: "absolute", width: orbitR * 2, height: orbitR * 2, borderRadius: "50%",
                zIndex: 2, pointerEvents: "none",
                transform: `rotate(${(360 / n) * i}deg)`,
              }}>
                <div style={{ position: "absolute", inset: 0, animation: `orbitSpin ${dur}s linear infinite` }}>
                  <div style={{
                    position: "absolute", top: -tokenSize / 2, left: "50%", marginLeft: -tokenSize / 2,
                    animation: `orbResolve ${dur}s linear infinite`,
                  }}>
                    {t.isMe ? (
                      <div style={{ borderRadius: "50%", boxShadow: "0 0 0 2px rgba(11,11,15,0.92), 0 0 20px -2px rgba(124,92,255,0.75)" }}>
                        <AvatarArt value={myAvatar} size={tokenSize} />
                      </div>
                    ) : (
                      <div title={t.name} style={{
                        width: tokenSize, height: tokenSize, borderRadius: "50%",
                        background: tokenGrads[t.colorIndex % tokenGrads.length],
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1.5px solid rgba(255,255,255,0.16)",
                        boxShadow: "0 0 0 2px rgba(11,11,15,0.92), 0 0 18px -3px rgba(124,92,255,0.6)",
                      }}>
                        <Icon.account size={Math.round(tokenSize * 0.5)} color="#fff" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
          );
        })()}

        {/* Title + subtitle — clearly below the radar with real breathing room */}
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", display: "flex", flexDirection: "column", gap: 8, maxWidth: 460 }}>
          <h1 style={{ fontFamily: "var(--font-display, var(--font-space-grotesk))", fontSize: isShortPhone ? 22 : isPhone ? 22 : 30, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em", margin: 0 }}>Finding your match…</h1>
          <div style={{ color: textMuted, fontSize: isShortPhone ? 12 : 14 }}>
            {isShortPhone && elapsed >= 20 ? "Still searching — few squads are live right now." : "Looking for a squad that matches your crew's vibe."}
          </div>
          {/* Reassurance for a lone searcher with no match after ~20s — avoids the
              "stuck forever with no feedback" feeling. The Cancel button below is
              always available as the escape hatch. */}
          {elapsed >= 20 && !matchFound && !isShortPhone && !showLongSearch && (
            <div style={{
              marginTop: 4,
              maxWidth: 420,
              alignSelf: "center",
              padding: isPhone ? "10px 16px" : "12px 20px",
              borderRadius: 14,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: textMuted,
              fontSize: 14,
              lineHeight: 1.5,
            }}>
              Still searching — not many squads are live right now. Hang tight, or invite a friend.
            </div>
          )}
        </div>

        {/* ── Long-search branch card — after 75s with no match, offer clear paths
            forward. Search keeps running unless the user bails. ── */}
        {showLongSearch && (
          <div role="status" style={{
            position: "relative", zIndex: 2,
            width: "min(440px, calc(100vw - 32px))",
            background: "linear-gradient(145deg, #1a1228 0%, #0e0e18 100%)",
            border: "1.5px solid rgba(124,92,255,0.38)",
            borderRadius: "var(--radius-card, 20px)",
            padding: isShortPhone ? "12px 14px" : isPhone ? "16px 18px" : "18px 22px",
            boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
            display: "flex", flexDirection: "column", gap: 12, textAlign: "center",
          }}>
            <div style={{ color: textPrimary, fontFamily: "var(--font-display, var(--font-space-grotesk))", fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>
              Still looking — no squads are free right now.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" as const }}>
              <Button variant="tonal" size="sm" onClick={() => setLongSearchBaseline(elapsed)}>Keep waiting</Button>
              <Button variant="secondary" size="sm" onClick={() => router.push("/friends")}>Invite friends</Button>
              <Button variant="ghost" size="sm" onClick={handleCancel} loading={cancelling}>Back to lobby</Button>
            </div>
          </div>
        )}

        {/* ── Stats — v3 StatTile row (spec 04) ── */}
        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", gap: isShortPhone ? 8 : 12, justifyContent: "center",
          maxWidth: "min(720px, calc(100vw - 32px))",
          flexWrap: "wrap" as const,
        }}>
          <StatTile label="Elapsed" value={fmt(elapsed)} />
          <StatTile
            label="Squad size"
            value={
              <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
                {`${squad?.members.length ?? "?"} / 4`}
                {squadError && !squad && (
                  <button
                    onClick={() => fetchSquad(false)}
                    style={{
                      padding: 0, border: "none", background: "transparent",
                      color: "var(--accent, var(--violet-bright))", fontSize: 12, fontWeight: 700,
                      fontFamily: "var(--font-body)",
                      textDecoration: "underline", cursor: "pointer",
                    }}
                  >Retry</button>
                )}
              </span>
            }
          />
          <StatTile
            label="Status"
            live={!!matchFound}
            value={matchFound ? "Found!" : pollFailures >= 3 ? "Reconnecting…" : "Searching"}
          />
        </div>

        {/* Reconnect note — after ≥3 consecutive poll failures; clears itself on success. */}
        {pollFailures >= 3 && !matchFound && (
          <div role="status" style={{
            position: "relative", zIndex: 1,
            padding: "8px 18px", borderRadius: 999,
            background: "var(--coral-soft)",
            border: "1px solid color-mix(in srgb, var(--coral) 35%, transparent)",
            color: "var(--coral)",
            fontSize: 13, fontWeight: 600, textAlign: "center",
            maxWidth: "calc(100vw - 32px)",
          }}>
            Reconnecting to matchmaking… your squad is still in the queue.
          </div>
        )}

        {/* Queue signal — informational only while the squad is already searching. */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: isShortPhone ? "10px 20px" : "14px 36px", borderRadius: 999,
              background: "linear-gradient(135deg, rgba(194,255,61,0.15), rgba(124,92,255,0.25))",
              color: limeText,
              fontFamily: "var(--font-display, var(--font-space-grotesk))", fontSize: 14, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 8, justifyContent: "center" as const,
              border: "1px solid var(--lime-border, rgba(194,255,61,0.35))",
              width: isPhone ? "100%" : undefined,
            }}
          >
            <Icon.lightning size={18} color="var(--lime-text, #C2FF3D)" />
            {progressLabel}
          </div>
          <div style={{ color: textMuted, fontSize: isShortPhone ? 12 : 13 }}>
            We&apos;ll bring you a compatible squad as soon as one is online.
          </div>
        </div>

        <Button
          onClick={handleCancel}
          loading={cancelling}
          variant="ghost"
          style={{ position: "relative", zIndex: 1, minWidth: 176, width: isPhone ? "100%" : undefined }}
        >
          {cancelError ? "Try cancel again" : "Cancel search"}
        </Button>
        {cancelError && (
          <div role="alert" style={{
            position: "relative",
            zIndex: 1,
            color: "var(--coral)",
            fontFamily: "var(--font-display, var(--font-space-grotesk))",
            fontSize: 13,
            fontWeight: 700,
            textAlign: "center",
            maxWidth: 360,
          }}>
            {cancelError}
          </div>
        )}
      </div>
    </>
  );
}

export default function MatchmakingPage() {
  return (
    <Suspense fallback={<div style={{ color: "var(--text-muted)", padding: 40 }}>Loading…</div>}>
      <MatchmakingInner />
    </Suspense>
  );
}
