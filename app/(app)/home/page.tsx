"use client";
import { useState, useEffect } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { EmptyState } from "@/components/EmptyState";
import type { PublicSquad, MySquadLite } from "@giggle/core";
import { session, api, randomSquadName, resolveCover, coverName, coverSwatch, getTokenBalance, billing, formatSquadCodeInput, isValidSquadCode } from "@giggle/core";
import { useViewport } from "@/components/useViewport";

const MY_STATUS_LABEL: Record<string, string> = {
  idle: "Open",
  searching: "Searching",
  matched: "Matched",
  in_encounter: "Live",
};

// A squad earns the wide "promoted" slot only when it has live operational
// state — never by preference. Promote state, not favouritism.
const PROMOTABLE = new Set(["in_encounter", "searching", "matched"]);

export default function HomePage() {
  const router = useRouter();
  const { isPhone, isTablet } = useViewport();
  const [squadCode, setSquadCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [squadCodeFocused, setSquadCodeFocused] = useState(false);
  const [stats, setStats] = useState<{ liveEncounters: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mySquads, setMySquads] = useState<MySquadLite[]>([]);
  const [trending, setTrending] = useState<PublicSquad[] | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [tokenBal, setTokenBal] = useState(0);
  const [openHoveredId, setOpenHoveredId] = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.discoverSquads()
      .then((d) => { if (alive) setTrending(d.squads ?? []); })
      .catch(() => { if (alive) setTrending([]); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    setTokenBal(getTokenBalance());
    return billing.subscribe(() => setTokenBal(getTokenBalance()));
  }, []);

  useEffect(() => {
    api.getStats()
      .then(data => setStats(data))
      .catch(() => {/* keep null — strip shows a dash */});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { squads } = await api.mySquads();
        setMySquads(squads ?? []);
      } catch {/* not signed in / none yet — section renders its empty state */}
    })();
  }, []);

  async function handleLeaveSquad(squadId: string) {
    const previousSquads = mySquads;
    setActionError(null);
    setMySquads(prev => prev.filter(s => s.squadId !== squadId));
    setRemoveConfirmId(null);
    try {
      await api.leaveSquad(squadId);
    } catch (e) {
      setMySquads(previousSquads);
      setActionError((e as { message?: string })?.message || "Couldn't leave that squad.");
    }
  }

  function ensureAuthed() {
    if (session.isAuthed()) return true;
    setActionError("Sign in to continue.");
    router.push("/signin");
    return false;
  }

  async function handleCreate() {
    setActionError(null);
    if (!ensureAuthed()) return;
    setCreating(true);
    try {
      const squad = await api.createSquad({ squadName: randomSquadName(), tags: [] });
      router.push(`/lobby?squad=${squad.squadId}`);
    } catch (e: unknown) {
      console.error("createSquad failed:", e);
      setActionError((e as { message?: string })?.message || "Couldn't create a squad. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    const normalizedSquadCode = formatSquadCodeInput(squadCode);
    setSquadCode(normalizedSquadCode);
    if (!isValidSquadCode(normalizedSquadCode)) {
      setActionError("Enter a squad code in the format ABC-123.");
      return;
    }
    setActionError(null);
    if (!ensureAuthed()) return;
    setJoining(true);
    try {
      const squad = await api.joinSquad({ squadCode: normalizedSquadCode });
      if ("status" in squad && squad.status === "requested") {
        setActionError("Request sent — the leader will review it.");
        return;
      }
      router.push(`/lobby?squad=${squad.squadId}`);
    } catch (e: unknown) {
      console.error("joinSquad failed:", e);
      setActionError((e as { message?: string })?.message || "Couldn't join — check the code and try again.");
    } finally {
      setJoining(false);
    }
  }

  async function handleJoinTrending(sq: PublicSquad) {
    setJoiningId(sq.squadId);
    try {
      const res = await api.joinSquadById(sq.squadId);
      if ("status" in res && res.status === "requested") {
        setActionError("Request sent — the leader will review it.");
        setJoiningId(null);
        return;
      }
      router.push(`/lobby?squad=${res.squadId}`);
    } catch (e: unknown) {
      setActionError((e as { message?: string })?.message || "Couldn't join that squad.");
      setJoiningId(null);
    }
  }

  const firstName = (session.user?.name || "").split(" ")[0];
  const promoted = mySquads.find(s => PROMOTABLE.has(s.status)) ?? null;
  const restSquads = mySquads.filter(s => s !== promoted);
  const openSignals = trending?.length ?? 0;

  return (
    <div className="gg-reveal" style={{ display: "flex", flexDirection: "column", paddingBottom: 48 }}>

      {/* ── GREETING + LIVE STRIP ─────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 22 }}>
        <div style={{ minWidth: 0, maxWidth: 560 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 9 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--lime)", boxShadow: "0 0 10px var(--lime)" }} />
            Squad control room
          </div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-space-grotesk)", fontWeight: 800, fontSize: isPhone ? 26 : 30, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.05 }}>
            {firstName ? <>Welcome back, <span style={{ color: "var(--violet)" }}>{firstName}</span>.</> : "Welcome back."}
          </h1>
          <p style={{ margin: "7px 0 0", fontSize: isPhone ? 14 : 14.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Resume a room, open a fresh one, or match with a crew that shares your vibe.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "stretch", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 15, boxShadow: "var(--elev)", overflow: "hidden" }}>
          {[
            { k: "Your squads", v: String(mySquads.length), live: false },
            { k: "Open signals", v: trending === null ? "—" : String(openSignals), live: false },
            { k: "Live now", v: String(stats?.liveEncounters ?? 0), live: true },
          ].map((s, i) => (
            <div key={s.k} style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 2, minWidth: 92, borderLeft: i > 0 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}>{s.k}</span>
              <span style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em", color: s.live ? "var(--lime-text)" : "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                {s.live && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 999, background: "var(--lime)", boxShadow: "0 0 10px var(--lime)", marginRight: 5, verticalAlign: "middle" }} />}
                {s.v}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── COMMAND BAR: the two entry actions, consolidated ──────── */}
      <div style={{ display: "grid", gridTemplateColumns: isTablet ? "1fr" : "1.1fr 1fr", gap: 14, marginBottom: 26 }}>
        {/* Create */}
        <div style={{ position: "relative", overflow: "hidden", borderRadius: 18, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--elev)" }}>
          <div style={{ position: "absolute", left: 0, top: 14, bottom: 14, width: 3, borderRadius: 3, background: "var(--violet)" }} />
          <div style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", flexShrink: 0, background: "var(--violet)", boxShadow: "0 0 22px -6px rgba(118,87,255,0.85)" }}>
            <Icon.plus size={22} color="#fff" strokeWidth={2.6} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", color: "var(--text)" }}>Open a new room</div>
            <div style={{ marginTop: 2, fontSize: 12.5, color: "var(--text-muted)" }}>Start a squad, set a vibe, and go live in seconds.</div>
          </div>
          <button onClick={handleCreate} disabled={creating} className="gg-press" style={{ ...primaryBtn, height: 44, padding: "0 22px", width: "auto", opacity: creating ? 0.85 : 1 }}>
            {creating ? (<><span className="gg-spinner" /> Creating…</>) : "Create Squad"}
          </button>
        </div>
        {/* Join */}
        <div style={{ borderRadius: 18, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--elev)" }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", flexShrink: 0, background: "var(--overlay)", boxShadow: "inset 0 0 0 1px var(--border)" }}>
            <Icon.enter size={20} color="var(--text-muted)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", color: "var(--text)" }}>Join with a code</div>
            <div style={{ display: "flex", gap: 9, marginTop: 10 }}>
              <input
                value={squadCode}
                onChange={e => { setSquadCode(formatSquadCodeInput(e.target.value)); if (actionError) setActionError(null); }}
                onKeyDown={e => { if (e.key === "Enter") handleJoin(); }}
                placeholder="ENTER-CODE"
                autoCapitalize="characters" autoComplete="off" spellCheck={false} inputMode="text"
                onFocus={() => setSquadCodeFocused(true)} onBlur={() => setSquadCodeFocused(false)}
                style={{ flex: 1, height: 44, borderRadius: 12, background: "var(--overlay)", border: squadCodeFocused ? "1px solid var(--violet)" : "1px solid var(--border-strong)", boxShadow: squadCodeFocused ? "0 0 0 3px color-mix(in srgb, var(--violet) 30%, transparent)" : "none", outline: "none", color: "var(--text)", padding: "0 14px", fontSize: 14, letterSpacing: "0.12em", fontFamily: "var(--font-space-grotesk)", transition: "box-shadow .2s var(--ease-ui), border-color .2s var(--ease-ui)" }}
              />
              <button onClick={handleJoin} disabled={joining || !isValidSquadCode(squadCode)} className="gg-press" style={{ ...primaryBtn, width: "auto", padding: "0 20px", height: 44, minWidth: 72, opacity: joining || !isValidSquadCode(squadCode) ? 0.55 : 1 }}>
                {joining ? <span className="gg-spinner" /> : "Enter"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline action error */}
      {actionError && (
        <div role="alert" className="gg-toast" style={{ display: "flex", alignItems: "center", gap: 8, background: "color-mix(in srgb, var(--coral) 12%, var(--surface))", border: "1px solid color-mix(in srgb, var(--coral) 45%, transparent)", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "var(--coral)", marginBottom: 22 }}>
          <Icon.flag size={14} color="var(--coral)" />
          <span style={{ flex: 1 }}>{actionError}</span>
          <button onClick={() => setActionError(null)} aria-label="Dismiss" style={{ width: 44, height: 44, margin: "-10px -10px -10px 0", background: "none", border: "none", cursor: "pointer", color: "var(--coral)", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.close size={14} color="var(--coral)" />
          </button>
        </div>
      )}

      {/* ── DASHBOARD: your squads (main) + live signals (rail) ───── */}
      <div style={{ display: "grid", gridTemplateColumns: isTablet ? "1fr" : "1.55fr 1fr", gap: 22, alignItems: "start" }}>
        {/* MAIN — your squads */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
            <Icon.account size={18} color="var(--violet)" />
            <h2 style={sectionTitle}>Your squads</h2>
            {mySquads.length > 0 && <span style={{ fontSize: 12.5, color: "var(--text-dim)", fontWeight: 600 }}>{mySquads.length}</span>}
            {mySquads.length > 0 && (
              <button onClick={() => router.push("/discover")} style={linkBtn}>Find more</button>
            )}
          </div>

          {mySquads.length === 0 ? (
            <EmptyState
              icon={<Icon.account size={20} color="var(--text-dim)" />}
              title="No squads yet"
              body="Open your first room above, or browse open squads looking for members right now."
              primary={{ label: "Browse open squads", onClick: () => router.push("/discover") }}
            />
          ) : (
            <>
              {promoted && (
                <SquadTile
                  squad={promoted}
                  promoted
                  hovered={openHoveredId === promoted.squadId}
                  confirming={removeConfirmId === promoted.squadId}
                  onHover={setOpenHoveredId}
                  onOpen={() => router.push(`/lobby?squad=${promoted.squadId}`)}
                  onAskLeave={() => setRemoveConfirmId(promoted.squadId)}
                  onCancelLeave={() => setRemoveConfirmId(null)}
                  onLeave={() => handleLeaveSquad(promoted.squadId)}
                />
              )}
              <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: 14, marginTop: promoted ? 14 : 0 }}>
                {restSquads.map(s => (
                  <SquadTile
                    key={s.squadId}
                    squad={s}
                    hovered={openHoveredId === s.squadId}
                    confirming={removeConfirmId === s.squadId}
                    onHover={setOpenHoveredId}
                    onOpen={() => router.push(`/lobby?squad=${s.squadId}`)}
                    onAskLeave={() => setRemoveConfirmId(s.squadId)}
                    onCancelLeave={() => setRemoveConfirmId(null)}
                    onLeave={() => handleLeaveSquad(s.squadId)}
                  />
                ))}
                <button onClick={handleCreate} className="gg-press-card" style={{ minHeight: 130, borderRadius: 18, border: "1px dashed var(--border-strong)", background: "var(--surface)", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
                  <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--overlay)", display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 1px var(--border)" }}>
                    <Icon.plus size={20} color="var(--violet)" />
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>New squad</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* RAIL — live signals + find a match */}
        <div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, boxShadow: "var(--elev)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "15px 16px 12px" }}>
              <Icon.trend size={18} color="var(--lime)" />
              <h2 style={{ ...sectionTitle, fontSize: 16 }}>Live signals</h2>
              <button onClick={() => router.push("/discover")} style={{ ...linkBtn, marginLeft: "auto" }}>View all</button>
            </div>
            {trending === null ? (
              [0, 1, 2].map(i => <div key={i} className="gg-shimmer" style={{ height: 62, borderTop: "1px solid var(--border)" }} />)
            ) : trending.length === 0 ? (
              <div style={{ padding: "16px", borderTop: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13 }}>
                No open squads right now. <button onClick={handleCreate} style={{ ...linkBtn, color: "var(--violet)" }}>Open one →</button>
              </div>
            ) : (
              trending.slice(0, 5).map(sq => {
                const spots = Math.max(0, sq.maxSlots - sq.memberCount);
                return (
                  <div key={sq.squadId} onClick={() => handleJoinTrending(sq)} role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === "Enter") handleJoinTrending(sq); }}
                    className="gg-focusable"
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: "1px solid var(--border)", cursor: "pointer" }}>
                    <span style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: resolveCover(sq.coverImage), boxShadow: "inset 0 0 0 1px var(--border)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sq.squadName}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 3 }}>
                        {(sq.tags ?? []).slice(0, 2).map(t => (
                          <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-body)", background: "var(--overlay)", borderRadius: 6, padding: "1px 7px" }}>{t}</span>
                        ))}
                        {(!sq.tags || sq.tags.length === 0) && <span style={{ fontSize: 11, color: "var(--text-dim)" }}>No vibes</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>{spots} spot{spots !== 1 ? "s" : ""}</div>
                      <span className="gg-press" style={{ display: "inline-block", marginTop: 5, height: 28, lineHeight: "28px", padding: "0 12px", borderRadius: 999, background: "var(--overlay)", color: "var(--text)", boxShadow: "inset 0 0 0 1px var(--border-strong)", fontWeight: 700, fontSize: 12 }}>
                        {joiningId === sq.squadId ? "…" : "Join"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Find a match */}
          <div style={{ marginTop: 18, position: "relative", overflow: "hidden", borderRadius: 18, padding: 18, background: "var(--surface)", border: "1px solid var(--border-strong)", boxShadow: "var(--elev)" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 60% at 90% 10%, rgba(47,230,200,0.10), transparent 60%)", pointerEvents: "none" }} />
            <h3 style={{ position: "relative", margin: 0, fontFamily: "var(--font-space-grotesk)", fontWeight: 800, fontSize: 16, color: "var(--text)", letterSpacing: "-0.01em" }}>Ready to meet a new crew?</h3>
            <p style={{ position: "relative", margin: "5px 0 0", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.45 }}>Skip the browsing — open a squad, then match with a crew that shares your vibe.</p>
            <button onClick={() => (promoted || mySquads[0]) ? router.push(`/lobby?squad=${(promoted || mySquads[0]).squadId}`) : handleCreate()} className="gg-press" style={{ position: "relative", marginTop: 14, width: "100%", height: 46, border: "none", borderRadius: 999, background: "var(--lime)", color: "var(--on-accent)", fontFamily: "var(--font-space-grotesk)", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 0 26px -10px rgba(183,255,42,0.6)" }}>
              {mySquads.length ? "Find a Match" : "Create a squad to match"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Squad tile — cover-driven, with a visible (supportive) theme label ───── */
function SquadTile({
  squad, promoted = false, hovered, confirming, onHover, onOpen, onAskLeave, onCancelLeave, onLeave,
}: {
  squad: MySquadLite;
  promoted?: boolean;
  hovered: boolean;
  confirming: boolean;
  onHover: (id: string | null) => void;
  onOpen: () => void;
  onAskLeave: () => void;
  onCancelLeave: () => void;
  onLeave: () => void;
}) {
  const statusLabel = MY_STATUS_LABEL[squad.status] ?? squad.status;
  const isLive = squad.status === "in_encounter";
  const theme = coverName(squad.coverImage);

  return (
    <div
      onClick={onOpen}
      role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      onMouseEnter={() => onHover(squad.squadId)}
      onMouseLeave={() => onHover(null)}
      className="gg-focusable gg-press-card"
      style={{
        position: "relative", overflow: "hidden", borderRadius: 18, cursor: "pointer",
        minHeight: promoted ? undefined : 130,
        padding: promoted ? "20px 22px" : 15,
        border: hovered ? "1px solid var(--border-strong)" : "1px solid var(--border)",
        boxShadow: hovered ? "0 16px 40px -22px rgba(0,0,0,0.7)" : "var(--elev)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "transform .18s var(--ease-ui), box-shadow .2s var(--ease-ui), border-color .2s var(--ease-ui)",
        display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12,
      }}
    >
      {/* cover + legibility scrim */}
      <div style={{ position: "absolute", inset: 0, background: resolveCover(squad.coverImage) }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,8,11,0.93) 14%, rgba(8,8,11,0.55) 46%, rgba(8,8,11,0.12) 100%)" }} />

      {/* top row: status + members + theme + leave */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 999, background: "rgba(8,8,11,0.55)", backdropFilter: "blur(6px)", boxShadow: isLive ? "inset 0 0 0 1px rgba(183,255,42,0.5)" : "inset 0 0 0 1px rgba(255,255,255,0.16)" }}>
            {isLive && <span style={{ width: 6, height: 6, borderRadius: 999, background: "#C2FF3D", boxShadow: "0 0 8px #C2FF3D" }} />}
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", color: isLive ? "#C2FF3D" : "#E7E7F0", textTransform: "uppercase" }}>{isLive ? "Live now" : statusLabel}</span>
          </span>
          {theme && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 7, background: "rgba(8,8,11,0.5)", backdropFilter: "blur(6px)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#E7E7F0" }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: coverSwatch(squad.coverImage), boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)" }} />
              {theme}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 999, background: "rgba(8,8,11,0.55)", backdropFilter: "blur(6px)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)" }}>
            <Icon.account size={12} color="#E7E7F0" />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#E7E7F0", fontVariantNumeric: "tabular-nums" }}>{squad.memberCount}/{squad.maxSlots}</span>
          </span>
          <button onClick={e => { e.stopPropagation(); onAskLeave(); }} aria-label={`Leave ${squad.squadName}`} title="Leave squad" className="gg-press" style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 999, border: "none", background: "rgba(8,8,11,0.5)", backdropFilter: "blur(6px)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon.close size={13} color="#E7E7F0" />
          </button>
        </div>
      </div>

      {confirming && (
        <div onClick={e => e.stopPropagation()} className="gg-toast" style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(7,7,11,0.86)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#F4F4F7" }}>Leave “{squad.squadName}”?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onCancelLeave} className="gg-press" style={{ minHeight: 44, padding: "0 16px", borderRadius: 999, border: "1px solid var(--border)", background: "transparent", color: "#C9C9DA", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button onClick={onLeave} className="gg-press" style={{ minHeight: 44, padding: "0 16px", borderRadius: 999, border: "none", background: "var(--coral)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Leave</button>
          </div>
        </div>
      )}

      {/* bottom: name + open */}
      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 700, fontSize: promoted ? 22 : 18, color: "#F4F4F7", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{squad.squadName}</div>
          <div style={{ fontSize: 12, color: "#C9C9DA", marginTop: 2 }}>
            {squad.leaderName ? `Led by ${squad.leaderName}` : (squad.myRole === "leader" ? "You lead this" : "Your squad")}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onOpen(); }} className="gg-press" style={{ flexShrink: 0, height: 40, padding: "0 18px", borderRadius: 999, border: "none", cursor: "pointer", background: isLive ? "var(--lime)" : "var(--violet)", color: isLive ? "var(--on-accent)" : "#fff", fontFamily: "var(--font-inter)", fontWeight: 700, fontSize: 13.5, boxShadow: isLive ? "0 0 22px -8px rgba(183,255,42,0.6)" : "0 0 18px -8px rgba(118,87,255,0.8)" }}>
          {isLive ? "Rejoin" : "Open"}
        </button>
      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  margin: 0, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, fontSize: 18, color: "var(--text)", letterSpacing: "-0.01em",
};
const linkBtn: React.CSSProperties = {
  background: "none", border: "none", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "0 2px",
};
const primaryBtn: React.CSSProperties = {
  width: "100%", height: 44, border: "none", borderRadius: 999, background: "var(--violet)", color: "#fff",
  fontFamily: "var(--font-inter)", fontWeight: 700, fontSize: 14, cursor: "pointer",
  boxShadow: "0 0 22px -8px rgba(118,87,255,0.8)",
  whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
};
