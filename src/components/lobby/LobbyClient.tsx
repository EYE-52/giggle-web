"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import {
  acknowledgeEncounter,
  cancelSearch,
  createSquad,
  disconnectEncounter,
  getEncounterHandoffStatus,
  getEncounterToken,
  getLobbyToken,
  getMatchmakingStatus,
  getMySquad,
  getSquadById,
  kickMember,
  joinSquad,
  leaveSquad,
  promoteMember,
  setReadyState,
  skipEncounter,
  startSearch,
  updateSquadName,
} from "@/lib/api/squad";
import { BackendApiError } from "@/lib/api/client";
import type { EncounterHandoffResponse, MatchmakingStatusResponse, SquadState } from "@/types/giggle";
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

function SkipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 5l7 7-7 7" />
      <path d="M13 5l7 7-7 7" />
    </svg>
  );
}

function DisconnectIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
  squadName: string;
  status: SquadState["status"];
  members: SquadState["members"];
  leaderMemberId?: string | null;
}): SquadState => {
  return {
    squadId: data.squadId,
    squadCode: data.squadCode,
    squadName: data.squadName,
    status: data.status,
    members: data.members,
    leaderMemberId: data.leaderMemberId || undefined,
  };
};

export function LobbyClient({ backendToken, userName, userImage }: Props) {
  const [displayName, setDisplayName] = useState(userName || "");
  const [newSquadName, setNewSquadName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [squad, setSquad] = useState<SquadState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [joiningAgora, setJoiningAgora] = useState(false);
  const [matchStatus, setMatchStatus] = useState<MatchmakingStatusResponse | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<EncounterHandoffResponse | null>(null);

  const {
    joined,
    currentChannelName,
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
  const autoJoinedEncounterRef = useRef<string | null>(null);
  const encounterId = matchStatus?.match?.encounterId || null;
  const isInEncounterChannel = Boolean(joined && currentChannelName?.startsWith("encounter_"));
  const uidScope = isInEncounterChannel && encounterId ? encounterId : squad?.squadId;

  const uidToDisplayName = useMemo(() => {
    const map = new Map<number, string>();
    if (!squad || !uidScope) return map;

    for (const member of squad.members || []) {
      const uid = hashStringToUid(`${uidScope}:${member.userId}`);
      map.set(uid, member.displayName || member.userId);
    }

    return map;
  }, [squad, uidScope]);

  const remoteUsersByUid = useMemo(() => {
    return new Map(remoteUsers.map((user) => [Number(user.uid), user]));
  }, [remoteUsers]);

  const videoTiles = useMemo(() => {
    if (!squad || !uidScope) return [];

    const knownUids = new Set<number>();
    const squadTiles = (squad.members || []).map((member) => {
      const uid = hashStringToUid(`${uidScope}:${member.userId}`);
      knownUids.add(uid);
      const isSelf = member.memberId === myMember?.memberId;
      const remoteUser = remoteUsersByUid.get(uid);
      const track = isSelf ? localVideoTrack : remoteUser?.videoTrack || null;
      const micOn = isSelf ? Boolean(joined && isMicOn) : Boolean(remoteUser?.audioTrack);
      const showVideo = isSelf ? Boolean(localVideoTrack && isVideoOn) : Boolean(remoteUser?.videoTrack);
      const onlineText = isInEncounterChannel ? "In encounter room" : "In video lobby";
      const offlineText = isInEncounterChannel ? "Not in encounter room" : "Not in video lobby";
      const presence = isSelf ? (joined ? onlineText : offlineText) : remoteUser ? onlineText : offlineText;

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

    if (!isInEncounterChannel) {
      return squadTiles;
    }

    const opponentTiles = remoteUsers
      .filter((remoteUser) => !knownUids.has(Number(remoteUser.uid)))
      .map((remoteUser) => {
        const numericUid = Number(remoteUser.uid);
        return {
          key: `encounter-${numericUid}`,
          label: `Encounter participant ${String(numericUid).slice(-4)}`,
          role: "member",
          ready: undefined,
          presence: "In encounter room",
          micOn: Boolean(remoteUser.audioTrack),
          track: remoteUser.videoTrack || null,
          showVideo: Boolean(remoteUser.videoTrack),
        };
      });

    return [...squadTiles, ...opponentTiles];
  }, [
    isInEncounterChannel,
    isMicOn,
    isVideoOn,
    joined,
    localVideoTrack,
    myMember?.memberId,
    remoteUsers,
    remoteUsersByUid,
    squad,
    uidScope,
    uidToDisplayName,
  ]);

  const encounterSplitTiles = useMemo(() => {
    if (!squad || !uidScope) {
      return { ownSquadTiles: [], opponentSquadTiles: [] };
    }

    const knownUids = new Set<number>();
    const ownSquadTiles = (squad.members || []).map((member) => {
      const uid = hashStringToUid(`${uidScope}:${member.userId}`);
      knownUids.add(uid);
      const isSelf = member.memberId === myMember?.memberId;
      const remoteUser = remoteUsersByUid.get(uid);
      const track = isSelf ? localVideoTrack : remoteUser?.videoTrack || null;
      const micOn = isSelf ? Boolean(joined && isMicOn) : Boolean(remoteUser?.audioTrack);
      const showVideo = isSelf ? Boolean(localVideoTrack && isVideoOn) : Boolean(remoteUser?.videoTrack);
      const onlineText = isInEncounterChannel ? "In encounter room" : "In video lobby";
      const offlineText = isInEncounterChannel ? "Not in encounter room" : "Not in video lobby";
      const presence = isSelf ? (joined ? onlineText : offlineText) : remoteUser ? onlineText : offlineText;

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

    const opponentSquadTiles = remoteUsers
      .filter((remoteUser) => !knownUids.has(Number(remoteUser.uid)))
      .map((remoteUser) => {
        const numericUid = Number(remoteUser.uid);
        return {
          key: `encounter-${numericUid}`,
          label: `Encounter participant ${String(numericUid).slice(-4)}`,
          role: "member",
          ready: undefined,
          presence: "In encounter room",
          micOn: Boolean(remoteUser.audioTrack),
          track: remoteUser.videoTrack || null,
          showVideo: Boolean(remoteUser.videoTrack),
        };
      });

    return { ownSquadTiles, opponentSquadTiles };
  }, [
    isInEncounterChannel,
    isMicOn,
    isVideoOn,
    joined,
    localVideoTrack,
    myMember?.memberId,
    remoteUsers,
    remoteUsersByUid,
    squad,
    uidScope,
    uidToDisplayName,
  ]);

  const ownEncounterSquadName = matchStatus?.match?.ownSquadName || squad?.squadName || "Your squad";
  const opponentEncounterSquadName =
    matchStatus?.match?.opponentSquadName ||
    (handoffStatus
      ? handoffStatus.squadAId === squad?.squadId
        ? handoffStatus.squadBName
        : handoffStatus.squadAName
      : "Opponent squad");

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
            squadName: result.squadName || "Unnamed squad",
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
    if (!squad?.squadId) {
      setMatchStatus(null);
      setHandoffStatus(null);
      return;
    }

    let cancelled = false;

    const refreshMatchStatus = async () => {
      try {
        const status = await getMatchmakingStatus(backendToken, squad.squadId);
        if (cancelled) return;
        setMatchStatus(status);

        const activeEncounterId = status.match?.encounterId;
        if (activeEncounterId) {
          const handoff = await getEncounterHandoffStatus(backendToken, activeEncounterId);
          if (!cancelled) {
            setHandoffStatus(handoff);
          }
        } else if (!cancelled) {
          setHandoffStatus(null);
        }
      } catch {
        if (!cancelled) {
          setMatchStatus(null);
          setHandoffStatus(null);
        }
      }
    };

    void refreshMatchStatus();
    const intervalId = setInterval(() => {
      void refreshMatchStatus();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [backendToken, squad?.squadId]);

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

  useEffect(() => {
    if (!encounterId || !squad || joiningAgora) return;
    if (handoffStatus?.status !== "active" || squad.status !== "in_encounter") return;

    const expectedChannel = `encounter_${encounterId}`;
    if (joined && currentChannelName === expectedChannel) {
      return;
    }

    if (autoJoinedEncounterRef.current === encounterId) {
      return;
    }

    autoJoinedEncounterRef.current = encounterId;

    const autoJoinEncounter = async () => {
      setJoiningAgora(true);
      setMessage("Encounter is active. Joining common encounter room...");
      try {
        await leaveLobby();
        const tokenData = await getEncounterToken(backendToken, squad.squadId, encounterId);
        await joinLobby({
          appId: tokenData.appId,
          channelName: tokenData.channelName,
          token: tokenData.rtcToken,
          uid: tokenData.uid,
        });
        setMessage("Joined encounter video.");
      } catch (error) {
        const err = error as BackendApiError;
        setMessage(err.message || "Failed to auto-join encounter video");
      } finally {
        setJoiningAgora(false);
      }
    };

    void autoJoinEncounter();
  }, [
    backendToken,
    currentChannelName,
    encounterId,
    handoffStatus?.status,
    joinLobby,
    joined,
    joiningAgora,
    leaveLobby,
    squad,
  ]);

  const onCreateSquad = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const data = await createSquad(backendToken, displayName || userName);
      setSquad(
        toSquadState({
          squadId: data.squadId,
          squadCode: data.squadCode,
          squadName: data.squadName,
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
          squadName: data.squadName,
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

  const onUpdateSquadName = async () => {
    if (!squad || !isLeader) return;

    const normalized = newSquadName.trim();
    if (!normalized) {
      setMessage("Squad name cannot be empty.");
      return;
    }

    setLoading(true);
    try {
      await updateSquadName(backendToken, squad.squadId, normalized);
      await refreshSquad(squad.squadId);
      setNewSquadName("");
      setMessage("Squad name updated.");
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

  const onCancelSearch = async () => {
    if (!squad) return;
    setLoading(true);

    try {
      await cancelSearch(backendToken, squad.squadId);
      await refreshSquad(squad.squadId);
      setMessage("Matchmaking canceled.");
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onKickMember = async (memberId: string) => {
    if (!squad) return;
    setLoading(true);

    try {
      await kickMember(backendToken, squad.squadId, memberId);
      await refreshSquad(squad.squadId);
      setMessage("Member removed from squad.");
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onPromoteMember = async (memberId: string) => {
    if (!squad) return;
    setLoading(true);

    try {
      await promoteMember(backendToken, squad.squadId, memberId);
      await refreshSquad(squad.squadId);
      setMessage("Leadership transferred.");
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

  const onAcknowledgeEncounter = async () => {
    if (!squad || !encounterId) return;
    setLoading(true);

    try {
      await acknowledgeEncounter(backendToken, encounterId, squad.squadId);
      setMessage("Encounter acknowledged.");
      const handoff = await getEncounterHandoffStatus(backendToken, encounterId);
      setHandoffStatus(handoff);
      const status = await getMatchmakingStatus(backendToken, squad.squadId);
      setMatchStatus(status);
      await refreshSquad(squad.squadId);
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onJoinEncounterVideo = async () => {
    if (!squad || !encounterId) return;
    setJoiningAgora(true);

    try {
      await leaveLobby();
      const tokenData = await getEncounterToken(backendToken, squad.squadId, encounterId);
      await joinLobby({
        appId: tokenData.appId,
        channelName: tokenData.channelName,
        token: tokenData.rtcToken,
        uid: tokenData.uid,
      });
      setMessage("Joined encounter video.");
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message || "Failed to join encounter video");
    } finally {
      setJoiningAgora(false);
    }
  };

  const onDisconnectEncounter = async () => {
    if (!squad || !encounterId) return;
    setLoading(true);

    try {
      await disconnectEncounter(backendToken, squad.squadId, encounterId);
      await leaveLobby();
      await refreshSquad(squad.squadId);
      setMatchStatus(null);
      setHandoffStatus(null);
      setMessage("Disconnected from encounter.");
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSkipEncounter = async () => {
    if (!squad || !encounterId) return;
    setLoading(true);

    try {
      await skipEncounter(backendToken, squad.squadId, encounterId);
      await leaveLobby();
      await refreshSquad(squad.squadId);
      const status = await getMatchmakingStatus(backendToken, squad.squadId);
      setMatchStatus(status);
      setHandoffStatus(null);
      setMessage("Encounter skipped. Requeued for matchmaking.");
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message);
    } finally {
      setLoading(false);
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
                Squad name: <span className="font-semibold">{squad.squadName}</span>
              </div>

              <div className="text-sm">
                Invite code: <span className="font-semibold">{squad.squadCode}</span>
              </div>

              <div className="text-xs text-slate-600 rounded-lg border border-slate-200 bg-slate-50 p-2">
                Match state: <span className="font-medium">{matchStatus?.state || squad.status}</span>
                {matchStatus?.queue ? ` | Queue wait: ${matchStatus.queue.waitSeconds}s` : ""}
                {encounterId ? ` | Encounter: ${encounterId}` : ""}
              </div>

              {encounterId && matchStatus?.match ? (
                <div className="text-xs text-slate-700 rounded-lg border border-cyan-200 bg-cyan-50 p-2">
                  Encounter room: <span className="font-semibold">{matchStatus.match.ownSquadName}</span>
                  {" vs "}
                  <span className="font-semibold">{matchStatus.match.opponentSquadName}</span>
                </div>
              ) : null}

              {isLeader ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Squad Name</div>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-lg border border-slate-300 p-2 text-sm"
                      value={newSquadName}
                      onChange={(e) => setNewSquadName(e.target.value)}
                      placeholder={squad.squadName}
                      maxLength={32}
                    />
                    <button
                      className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                      onClick={onUpdateSquadName}
                      disabled={loading || newSquadName.trim().length < 2}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : null}

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
                    label={joined ? "Leave video lobby" : "Join lobby video"}
                    onClick={joined ? () => leaveLobby() : onJoinLobbyVideo}
                    disabled={joiningAgora || (joined && undefined) || (!joined && undefined)}
                    tone={joined ? "slate" : "indigo"}
                    icon={<CameraStateIcon enabled={joined} className="h-6 w-6" />}
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

                  {isLeader && squad.status === "idle" ? (
                    <ActionIconButton
                      label="Start matchmaking"
                      title={
                        allReady
                          ? "Start matchmaking"
                          : "Everyone must be ready"
                      }
                      onClick={onStartSearch}
                      disabled={loading || !allReady}
                      tone="emerald"
                      icon={<SearchIcon />}
                    />
                  ) : null}

                  {isLeader && squad.status === "searching" ? (
                    <ActionIconButton
                      label="Cancel matchmaking"
                      onClick={onCancelSearch}
                      disabled={loading}
                      tone="slate"
                      icon={<SearchIcon />}
                    />
                  ) : null}

                  {encounterId && squad.status === "matched" ? (
                    <ActionIconButton
                      label="Acknowledge encounter"
                      onClick={onAcknowledgeEncounter}
                      disabled={loading}
                      tone="emerald"
                      icon={<CheckIcon />}
                    />
                  ) : null}

                  {encounterId && squad.status !== "idle" ? (
                    <ActionIconButton
                      label="Join encounter video"
                      onClick={onJoinEncounterVideo}
                      disabled={joiningAgora}
                      tone="cyan"
                      icon={<CameraStateIcon enabled className="h-6 w-6" />}
                    />
                  ) : null}

                  {encounterId ? (
                    <ActionIconButton
                      label="Disconnect encounter"
                      onClick={onDisconnectEncounter}
                      disabled={loading}
                      tone="rose"
                      icon={<DisconnectIcon />}
                    />
                  ) : null}

                  {isLeader && encounterId ? (
                    <ActionIconButton
                      label="Skip encounter"
                      onClick={onSkipEncounter}
                      disabled={loading}
                      tone="rose"
                      icon={<SkipIcon />}
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
                  Hover an icon to see action name. {isLeader ? "Matchmaking is leader-only." : ""}
                </div>
              </div>

              {isLeader ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Member Management</div>
                  <div className="grid gap-2">
                    {(squad.members || []).map((member) => {
                      const isMe = member.memberId === myMember?.memberId;
                      return (
                        <div key={member.memberId} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                          <div>
                            <div className="font-medium">{member.displayName || member.userId}</div>
                            <div className="text-slate-500">{member.role}</div>
                          </div>
                          <div className="flex gap-2">
                            {member.role !== "leader" ? (
                              <>
                                <button
                                  className="rounded-md bg-indigo-600 px-2 py-1 text-white disabled:opacity-50"
                                  onClick={() => onPromoteMember(member.memberId)}
                                  disabled={loading || isMe}
                                >
                                  Promote
                                </button>
                                <button
                                  className="rounded-md bg-rose-600 px-2 py-1 text-white disabled:opacity-50"
                                  onClick={() => onKickMember(member.memberId)}
                                  disabled={loading || isMe}
                                >
                                  Kick
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">{isInEncounterChannel ? "Encounter Room" : "Video Lobby"}</h3>
                <span className="text-sm text-slate-500">Participants: {participantsCount}</span>
              </div>

              {isInEncounterChannel ? (
                <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] items-start">
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-slate-500">{ownEncounterSquadName}</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {encounterSplitTiles.ownSquadTiles.map((tile) => (
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
                  </div>

                  <div className="hidden md:block w-px self-stretch bg-slate-300 rounded-full" />

                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-slate-500">{opponentEncounterSquadName}</div>
                    {encounterSplitTiles.opponentSquadTiles.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {encounterSplitTiles.opponentSquadTiles.map((tile) => (
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
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        Waiting for opponent squad members to join encounter video...
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {videoTiles.map((tile) => (
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
            </section>
          </>
        )}

        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </div>
    </main>
  );
}
