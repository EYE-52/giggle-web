"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import {
  createSquad,
  getLobbyToken,
  getMySquad,
  getSquadById,
  joinSquad,
  leaveSquad,
  setReadyState,
  startSearch,
} from "@/lib/api/squad";
import { BackendApiError } from "@/lib/api/client";
import type { SquadState } from "@/types/giggle";
import { useSquadLobbyAgora } from "@/lib/agora/useSquadLobbyAgora";
import { CameraStateIcon, MicStateIcon, VideoTile } from "@/components/lobby/VideoTile";

type Props = {
  backendToken: string;
  userName: string;
  userImage?: string | null;
};

type ActionIconButtonProps = {
  label: string;
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  tone: "indigo" | "slate" | "amber" | "cyan" | "emerald" | "rose";
  icon: ReactNode;
};

const toneClassMap: Record<ActionIconButtonProps["tone"], string> = {
  indigo: "bg-indigo-600 text-white",
  slate: "bg-slate-200 text-slate-900",
  amber: "bg-amber-500 text-white",
  cyan: "bg-cyan-600 text-white",
  emerald: "bg-emerald-600 text-white",
  rose: "bg-rose-600 text-white",
};

function ActionIconButton({ label, title, onClick, disabled, tone, icon }: ActionIconButtonProps) {
  return (
    <button
      className={`h-12 w-12 rounded-xl flex items-center justify-center disabled:opacity-50 ${toneClassMap[tone]}`}
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={label}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h10" />
      <path d="M14 5h5v14h-5" />
    </svg>
  );
}

const hashStringToUid = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }

  const unsigned = hash >>> 0;
  return unsigned === 0 ? 1 : unsigned;
};

const toSquadState = (data: {
  squadId: string;
  squadCode: string;
  status: SquadState["status"];
  members: SquadState["members"];
  leaderMemberId?: string | null;
}): SquadState => {
  return {
    squadId: data.squadId,
    squadCode: data.squadCode,
    status: data.status,
    members: data.members,
    leaderMemberId: data.leaderMemberId || undefined,
  };
};

export function LobbyClient({ backendToken, userName, userImage }: Props) {
  const [displayName, setDisplayName] = useState(userName || "");
  const [inviteCode, setInviteCode] = useState("");
  const [squad, setSquad] = useState<SquadState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [joiningAgora, setJoiningAgora] = useState(false);

  const {
    joined,
    localVideoTrack,
    remoteUsers,
    participantsCount,
    isMicOn,
    isVideoOn,
    joinLobby,
    leaveLobby,
    toggleMic,
    toggleVideo,
  } = useSquadLobbyAgora();

  const myMember = useMemo(() => {
    if (!squad || !squad.members || squad.members.length === 0) return null;
    return squad.members.find((member) => member.displayName === displayName) || squad.members[0] || null;
  }, [displayName, squad]);

  const isLeader = myMember?.role === "leader";
  const allReady = squad && squad.members && squad.members.length > 0 && squad.members.every((member) => member.ready);

  const uidToDisplayName = useMemo(() => {
    const map = new Map<number, string>();
    if (!squad) return map;

    for (const member of squad.members || []) {
      const uid = hashStringToUid(`${squad.squadId}:${member.userId}`);
      map.set(uid, member.displayName || member.userId);
    }

    return map;
  }, [squad]);

  const remoteUsersByUid = useMemo(() => {
    return new Map(remoteUsers.map((user) => [Number(user.uid), user]));
  }, [remoteUsers]);

  const videoTiles = useMemo(() => {
    if (!squad) return [];

    return (squad.members || []).map((member) => {
      const uid = hashStringToUid(`${squad.squadId}:${member.userId}`);
      const isSelf = member.memberId === myMember?.memberId;
      const remoteUser = remoteUsersByUid.get(uid);
      const track = isSelf ? localVideoTrack : remoteUser?.videoTrack || null;
      const micOn = isSelf ? Boolean(joined && isMicOn) : Boolean(remoteUser?.audioTrack);
      const showVideo = isSelf ? Boolean(localVideoTrack && isVideoOn) : Boolean(remoteUser?.videoTrack);
      const presence = isSelf ? (joined ? "In video lobby" : "Not in video lobby") : remoteUser ? "In video lobby" : "Not in video lobby";

      return {
        key: member.memberId,
        label: member.displayName || uidToDisplayName.get(uid) || member.userId,
        role: member.role,
        ready: member.ready,
        presence,
        micOn,
        track,
        showVideo,
      };
    });
  }, [isMicOn, isVideoOn, joined, localVideoTrack, myMember?.memberId, remoteUsersByUid, squad, uidToDisplayName]);

  const remoteUserSignature = useMemo(() => {
    return remoteUsers
      .map((user) => String(user.uid))
      .sort()
      .join("|");
  }, [remoteUsers]);

  const refreshSquad = useCallback(
    async (squadId: string) => {
      const state = await getSquadById(backendToken, squadId);
      setSquad(state);
    },
    [backendToken]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getMySquad(backendToken);
        if (!result.inSquad || !result.squadId) return;

        setSquad(
          toSquadState({
            squadId: result.squadId,
            squadCode: result.squadCode || "",
            status: result.status || "idle",
            members: result.members || [],
            leaderMemberId: result.leaderMemberId || undefined,
          })
        );
      } catch (error) {
        const err = error as BackendApiError;
        setMessage(err.message || "Failed to load squad context");
      }
    };

    void load();
  }, [backendToken]);

  useEffect(() => {
    if (!joined || !squad?.squadId) return;

    let cancelled = false;

    const syncSquad = async () => {
      try {
        const next = await getSquadById(backendToken, squad.squadId);
        if (!cancelled) {
          setSquad(next);
        }
      } catch {
        // Keep lobby usable even if an occasional sync request fails.
      }
    };

    void syncSquad();
    const intervalId = setInterval(() => {
      void syncSquad();
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [backendToken, joined, remoteUserSignature, squad?.squadId]);

  const onCreateSquad = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const data = await createSquad(backendToken, displayName || userName);
      setSquad(
        toSquadState({
          squadId: data.squadId,
          squadCode: data.squadCode,
          status: data.status,
          members: data.members,
        })
      );
      setMessage("Squad created. Share the code and join lobby video.");
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onJoinSquad = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const data = await joinSquad(backendToken, inviteCode, displayName || userName);
      setSquad(
        toSquadState({
          squadId: data.squadId,
          squadCode: data.squadCode,
          status: data.status,
          members: data.members,
        })
      );
      setMessage("Joined squad successfully.");
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onToggleReady = async () => {
    if (!squad || !myMember) return;
    setLoading(true);

    try {
      await setReadyState(backendToken, squad.squadId, !myMember.ready);
      await refreshSquad(squad.squadId);
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onStartSearch = async () => {
    if (!squad) return;
    setLoading(true);

    try {
      await startSearch(backendToken, squad.squadId);
      await refreshSquad(squad.squadId);
      setMessage("Matchmaking started. In Phase 1 this is state-only.");
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onLeaveSquad = async () => {
    if (!squad) return;
    setLoading(true);

    try {
      await leaveLobby(); // Leave video if connected
      await leaveSquad(backendToken, squad.squadId);
      setSquad(null); // Clear squad state
      setMessage("Left squad successfully.");
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onJoinLobbyVideo = async () => {
    if (!squad) return;
    setJoiningAgora(true);
    setMessage(null);

    try {
      const tokenData = await getLobbyToken(backendToken, squad.squadId);
      await joinLobby({
        appId: tokenData.appId,
        channelName: tokenData.channelName,
        token: tokenData.rtcToken,
        uid: tokenData.uid,
      });
      setMessage("Agora connected. You are now in squad lobby video.");
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message || "Failed to join lobby video");
    } finally {
      setJoiningAgora(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-6">
      <div className="mx-auto max-w-5xl grid gap-6">
        <header className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {userImage ? <img src={userImage} alt="profile" className="h-10 w-10 rounded-full" /> : null}
            <div>
              <p className="text-sm text-slate-500">Giggle Phase 1 Lobby Demo</p>
              <h1 className="font-semibold">Welcome, {userName}</h1>
            </div>
          </div>
          <button className="text-sm text-rose-600" onClick={() => signOut()}>
            Sign out
          </button>
        </header>

        {!squad ? (
          <section className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
              <h2 className="font-semibold">Create Squad</h2>
              <input
                className="w-full rounded-lg border border-slate-300 p-2"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
              />
              <button
                className="w-full rounded-lg bg-slate-900 text-white py-2 disabled:opacity-50"
                onClick={onCreateSquad}
                disabled={loading}
              >
                Create Squad
              </button>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
              <h2 className="font-semibold">Join Squad</h2>
              <input
                className="w-full rounded-lg border border-slate-300 p-2 uppercase"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="ABC-123"
              />
              <button
                className="w-full rounded-lg bg-emerald-600 text-white py-2 disabled:opacity-50"
                onClick={onJoinSquad}
                disabled={loading}
              >
                Join with Code
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Squad Lobby</h2>
                <div className="text-sm text-slate-500">Status: {squad.status}</div>
              </div>

              <div className="text-sm">
                Invite code: <span className="font-semibold">{squad.squadCode}</span>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Quick Controls</div>
                <div className="flex flex-wrap gap-2">
                  <ActionIconButton
                    label={myMember?.ready ? "Set not ready" : "Set ready"}
                    onClick={onToggleReady}
                    disabled={loading || !myMember}
                    tone="indigo"
                    icon={<CheckIcon />}
                  />

                  <ActionIconButton
                    label={joined ? "Lobby connected" : "Join lobby video"}
                    onClick={onJoinLobbyVideo}
                    disabled={joiningAgora || joined}
                    tone="indigo"
                    icon={<CameraStateIcon enabled className="h-6 w-6" />}
                  />

                  <ActionIconButton
                    label="Leave video lobby"
                    onClick={() => leaveLobby()}
                    disabled={!joined}
                    tone="slate"
                    icon={<CameraStateIcon enabled={false} className="h-6 w-6" />}
                  />

                  <ActionIconButton
                    label={isMicOn ? "Mute microphone" : "Unmute microphone"}
                    onClick={() => toggleMic()}
                    disabled={!joined}
                    tone="amber"
                    icon={<MicStateIcon enabled={isMicOn} className="h-6 w-6" />}
                  />

                  <ActionIconButton
                    label={isVideoOn ? "Turn camera off" : "Turn camera on"}
                    onClick={() => toggleVideo()}
                    disabled={!joined}
                    tone="cyan"
                    icon={<CameraStateIcon enabled={isVideoOn} className="h-6 w-6" />}
                  />

                  {isLeader ? (
                    <ActionIconButton
                      label="Start matchmaking"
                      title={
                        allReady && squad.status === "idle"
                          ? "Start matchmaking"
                          : "Everyone must be ready and squad must be idle"
                      }
                      onClick={onStartSearch}
                      disabled={loading || !allReady || squad.status !== "idle"}
                      tone="emerald"
                      icon={<SearchIcon />}
                    />
                  ) : null}

                  <ActionIconButton
                    label="Leave squad"
                    onClick={onLeaveSquad}
                    disabled={loading}
                    tone="rose"
                    icon={<ExitIcon />}
                  />
                </div>
                <div className="text-xs text-slate-500">
                  Hover an icon to see action name. {isLeader ? "Matchmaking is leader-only." : "Leader controls are hidden for members."}
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Video Lobby</h3>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span>Squad: {squad.members?.length ?? 0}</span>
                  <span className="text-slate-300">|</span>
                  <span>In video: {participantsCount}</span>
                </div>
              </div>

              <div className="flex gap-4">
                {/* Left: video tiles for members currently in video lobby */}
                <div className="flex-1 min-w-0">
                  {videoTiles.filter((t) => t.presence === "In video lobby").length === 0 ? (
                    <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 h-40 text-sm text-slate-400">
                      No one is in the video lobby yet
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {videoTiles
                        .filter((t) => t.presence === "In video lobby")
                        .map((tile) => (
                          <VideoTile
                            key={tile.key}
                            label={tile.label}
                            role={tile.role}
                            ready={tile.ready}
                            presence={tile.presence}
                            micOn={tile.micOn}
                            track={tile.track}
                            showVideo={tile.showVideo}
                          />
                        ))}
                    </div>
                  )}
                </div>

                {/* Right: all squad members roster */}
                <div className="w-52 shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Squad Members</div>
                  {(squad.members ?? []).map((member) => {
                    const tile = videoTiles.find((t) => t.key === member.memberId);
                    const inVideo = tile?.presence === "In video lobby";
                    return (
                      <div key={member.memberId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 bg-white border border-slate-200">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${inVideo ? "bg-emerald-500" : "bg-slate-300"}`}
                          title={inVideo ? "In video lobby" : "Not in video lobby"}
                        />
                        <span className="text-sm font-medium truncate flex-1">{member.displayName || member.userId}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${member.role === "leader" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                          {member.role}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}

        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </div>
    </main>
  );
}
