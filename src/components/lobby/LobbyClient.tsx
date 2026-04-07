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
  setLobbyVideoPresence,
  setEncounterVideoPresence,
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
      className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl disabled:opacity-50 ${toneClassMap[tone]}`}
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={label}
    >
      {icon}
      <span className="text-[10px] leading-tight font-medium text-center whitespace-nowrap">{label}</span>
    </button>
  );
}

// Ready / Not-ready toggle
function ReadyIcon({ ready }: { ready: boolean }) {
  if (ready) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Join / Leave video lobby
function JoinVideoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M16 10l6-3v10l-6-3" strokeLinejoin="round" />
      <path d="M9 3v3M9 18v3" strokeLinecap="round" />
    </svg>
  );
}
function LeaveVideoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M16 10l6-3v10l-6-3" strokeLinejoin="round" />
      <path d="M4 4l16 16" strokeLinecap="round" />
    </svg>
  );
}

// Mic on / off
function MicOnIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0014 0" strokeLinecap="round" />
      <path d="M12 19v3M9 22h6" strokeLinecap="round" />
    </svg>
  );
}
function MicOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0014 0" strokeLinecap="round" />
      <path d="M12 19v3M9 22h6" strokeLinecap="round" />
      <path d="M3 3l18 18" strokeLinecap="round" />
    </svg>
  );
}

// Camera on / off
function CamOnIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="14" height="10" rx="2" />
      <path d="M16 11l5-3v8l-5-3" strokeLinejoin="round" />
    </svg>
  );
}
function CamOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="14" height="10" rx="2" />
      <path d="M16 11l5-3v8l-5-3" strokeLinejoin="round" />
      <path d="M2 2l20 20" strokeLinecap="round" />
    </svg>
  );
}

// Start matchmaking
function MatchmakeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
      <path d="M8 11h6M11 8v6" strokeLinecap="round" />
    </svg>
  );
}

// Cancel search (X in circle)
function CancelSearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
    </svg>
  );
}

// Acknowledge (thumbs up)
function AcknowledgeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" strokeLinejoin="round" />
      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" strokeLinejoin="round" />
    </svg>
  );
}

// Join encounter video (video + arrow)
function JoinEncounterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="14" height="10" rx="2" />
      <path d="M16 11l5-3v8l-5-3" strokeLinejoin="round" />
      <path d="M6 12h5m-2-2l2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Disconnect (plug with X)
function DisconnectIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 14l-2-2m0 0l-2-2m2 2l-2 2m2-2l2 2" strokeLinecap="round" />
      <path d="M16 12a4 4 0 01-4 4H8" strokeLinecap="round" />
      <path d="M12 4v4M20 12h-4" strokeLinecap="round" />
      <path d="M3 3l18 18" strokeLinecap="round" />
    </svg>
  );
}

// Skip (forward arrows)
function SkipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 6l7 6-7 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 6l7 6-7 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Leave squad (door with arrow)
function LeaveSquadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" strokeLinecap="round" />
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
      // If we are not in Agora ourselves, use the backend-tracked inLobbyVideo flag
      const remoteOnline = joined ? Boolean(remoteUser) : Boolean(member.inLobbyVideo);
      const presence = isSelf ? (joined ? onlineText : offlineText) : remoteOnline ? onlineText : offlineText;

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
      const remoteOnline = joined ? Boolean(remoteUser) : Boolean(member.inLobbyVideo);
      const presence = isSelf ? (joined ? onlineText : offlineText) : remoteOnline ? onlineText : offlineText;

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

  // Always keep squad in sync while in a squad, even when not in video.
  useEffect(() => {
    if (!squad?.squadId) return;

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
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [backendToken, squad?.squadId]);

  // Immediately re-sync squad whenever the Agora remote-user list changes
  // (someone joins or leaves video lobby) so tiles update without waiting for
  // the next poll tick.
  useEffect(() => {
    if (!joined || !squad?.squadId) return;

    let cancelled = false;

    const syncSquad = async () => {
      try {
        const next = await getSquadById(backendToken, squad.squadId);
        if (!cancelled) setSquad(next);
      } catch {
        // best-effort
      }
    };

    void syncSquad();

    return () => {
      cancelled = true;
    };
  }, [backendToken, remoteUserSignature, squad?.squadId, joined]);

  useEffect(() => {
    if (!encounterId || !squad || joiningAgora) return;
    if (handoffStatus?.status !== "active" || squad.status !== "in_encounter") return;

    const expectedChannel = `encounter_${encounterId}`;
    if (joined && currentChannelName === expectedChannel) {
      return;
    }

    // Auto-join when: leader triggers it, OR this member was in the lobby video,
    // OR they just joined the lobby video while an encounter is already active.
    const meInLobbyVideo = Boolean(myMember?.inLobbyVideo);
    const leaderInEncounter = Boolean(
      squad.members.find((m) => m.role === "leader")?.inEncounterVideo
    );

    // Only auto-join if the leader has already joined (or we ARE the leader),
    // and we were in the lobby or are currently in Agora.
    const shouldAutoJoin = isLeader || ((meInLobbyVideo || joined) && leaderInEncounter);

    if (!shouldAutoJoin) return;

    if (autoJoinedEncounterRef.current === encounterId) {
      return;
    }

    autoJoinedEncounterRef.current = encounterId;

    const autoJoinEncounter = async () => {
      setJoiningAgora(true);
      setMessage("Encounter is active. Joining encounter room...");
      try {
        await leaveLobby();
        const tokenData = await getEncounterToken(backendToken, squad.squadId, encounterId);
        await joinLobby({
          appId: tokenData.appId,
          channelName: tokenData.channelName,
          token: tokenData.rtcToken,
          uid: tokenData.uid,
        });
        await Promise.all([
          setLobbyVideoPresence(backendToken, squad.squadId, false).catch(() => {}),
          setEncounterVideoPresence(backendToken, squad.squadId, true).catch(() => {}),
        ]);
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
    isLeader,
    joinLobby,
    joined,
    joiningAgora,
    leaveLobby,
    myMember?.inLobbyVideo,
    squad,
  ]);

  // When polling detects the encounter is over but we are still connected to an
  // encounter Agora channel, leave automatically so remote-user tiles clear.
  useEffect(() => {
    if (!joined || !currentChannelName?.startsWith("encounter_")) return;
    if (!matchStatus || matchStatus.match?.encounterId) return;
    autoJoinedEncounterRef.current = null;
    void setEncounterVideoPresence(backendToken, squad?.squadId ?? "", false).catch(() => {});
    void leaveLobby();
  }, [joined, currentChannelName, matchStatus, leaveLobby, backendToken, squad?.squadId]);

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
      if (joined) {
        await setLobbyVideoPresence(backendToken, squad.squadId, false).catch(() => {});
        await setEncounterVideoPresence(backendToken, squad.squadId, false).catch(() => {});
      }
      await leaveLobby();
      await leaveSquad(backendToken, squad.squadId);
      setSquad(null);
      setMessage("Left squad successfully.");
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onLeaveVideoLobby = async () => {
    if (!squad) return;
    try {
      await setLobbyVideoPresence(backendToken, squad.squadId, false).catch(() => {});
      await leaveLobby();
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message);
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
      await setLobbyVideoPresence(backendToken, squad.squadId, true).catch(() => {});
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
      await Promise.all([
        setLobbyVideoPresence(backendToken, squad.squadId, false).catch(() => {}),
        setEncounterVideoPresence(backendToken, squad.squadId, true).catch(() => {}),
      ]);
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
      const result = await disconnectEncounter(backendToken, squad.squadId, encounterId);
      await leaveLobby();
      await setEncounterVideoPresence(backendToken, squad.squadId, false).catch(() => {});
      if (result.isLeaderDisconnect) {
        // Leader ended the encounter — clear all state
        autoJoinedEncounterRef.current = null;
        await refreshSquad(squad.squadId);
        setMatchStatus(null);
        setHandoffStatus(null);
        setMessage("Encounter ended for your squad.");
      } else {
        // Non-leader just left the Agora channel; encounter still running
        setMessage("Left encounter video. Encounter is still active.");
      }
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
      autoJoinedEncounterRef.current = null;
      await setEncounterVideoPresence(backendToken, squad.squadId, false).catch(() => {});
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
    <main className="h-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden">
      <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {userImage ? (
            <img src={userImage} alt="profile" className="h-8 w-8 rounded-full" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {userName?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500">Giggle Phase 1 Lobby Demo</p>
            <h1 className="font-semibold text-sm">Welcome, {userName}</h1>
          </div>
        </div>
        <button className="text-sm text-rose-600" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      <div className="flex-1 overflow-hidden p-4">
        {!squad ? (
          <section className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-8">
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
          <div className="h-full flex gap-4 overflow-hidden">
            {/* LEFT: Squad Section */}
            <div className="w-72 shrink-0 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="shrink-0 bg-indigo-600 px-4 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-white text-sm">Squad</h2>
                <span className="text-xs bg-indigo-500 text-indigo-100 rounded-full px-2 py-0.5">{squad.status}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">

              <div className="text-xs">
                Squad: <span className="font-semibold">{squad.squadName}</span>
              </div>

              <div className="text-xs">
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
                  <input
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                    value={newSquadName}
                    onChange={(e) => setNewSquadName(e.target.value)}
                    placeholder={squad.squadName}
                    maxLength={32}
                  />
                  <button
                    className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                    onClick={onUpdateSquadName}
                    disabled={loading || newSquadName.trim().length < 2}
                  >
                    Save
                  </button>
                </div>
              ) : null}

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Quick Controls</div>
                <div className="flex flex-wrap gap-2">
                  <ActionIconButton
                    label={myMember?.ready ? "Not ready" : "Ready"}
                    onClick={onToggleReady}
                    disabled={loading || !myMember}
                    tone="indigo"
                    icon={<ReadyIcon ready={Boolean(myMember?.ready)} />}
                  />

                  <ActionIconButton
                    label={joined ? "Leave video" : "Join video"}
                    onClick={joined ? onLeaveVideoLobby : onJoinLobbyVideo}
                    disabled={joiningAgora || (joined && undefined) || (!joined && undefined)}
                    tone={joined ? "slate" : "indigo"}
                    icon={joined ? <LeaveVideoIcon /> : <JoinVideoIcon />}
                  />

                  <ActionIconButton
                    label={isMicOn ? "Mute" : "Unmute"}
                    onClick={() => toggleMic()}
                    disabled={!joined}
                    tone="amber"
                    icon={isMicOn ? <MicOnIcon /> : <MicOffIcon />}
                  />

                  <ActionIconButton
                    label={isVideoOn ? "Cam off" : "Cam on"}
                    onClick={() => toggleVideo()}
                    disabled={!joined}
                    tone="cyan"
                    icon={isVideoOn ? <CamOnIcon /> : <CamOffIcon />}
                  />

                  {isLeader && squad.status === "idle" ? (
                    <ActionIconButton
                      label="Find match"
                      title={!allReady ? "Everyone must be ready" : "Start matchmaking"}
                      onClick={onStartSearch}
                      disabled={loading || !allReady}
                      tone="emerald"
                      icon={<MatchmakeIcon />}
                    />
                  ) : null}

                  {isLeader && squad.status === "searching" ? (
                    <ActionIconButton
                      label="Cancel search"
                      onClick={onCancelSearch}
                      disabled={loading}
                      tone="slate"
                      icon={<CancelSearchIcon />}
                    />
                  ) : null}

                  {encounterId && squad.status === "matched" ? (
                    <ActionIconButton
                      label="Confirm match"
                      onClick={onAcknowledgeEncounter}
                      disabled={loading}
                      tone="emerald"
                      icon={<AcknowledgeIcon />}
                    />
                  ) : null}

                  {encounterId && squad.status !== "idle" ? (
                    <ActionIconButton
                      label="Join encounter"
                      onClick={onJoinEncounterVideo}
                      disabled={joiningAgora}
                      tone="cyan"
                      icon={<JoinEncounterIcon />}
                    />
                  ) : null}

                  {encounterId ? (
                    <ActionIconButton
                      label="Disconnect"
                      onClick={onDisconnectEncounter}
                      disabled={loading}
                      tone="rose"
                      icon={<DisconnectIcon />}
                    />
                  ) : null}

                  {isLeader && encounterId ? (
                    <ActionIconButton
                      label="Skip match"
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
                    icon={<LeaveSquadIcon />}
                  />
                </div>
                <div className="text-xs text-slate-500">
                  Hover an icon to see action name. {isLeader ? "Matchmaking is leader-only." : ""}
                </div>
              </div>


            </div>
            </div>

            {/* RIGHT: Video Lobby + Squad Members side by side */}
            <div className="flex-1 flex gap-4 overflow-hidden">

              {/* Video Lobby / Encounter Room */}
              <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className={`shrink-0 px-4 py-2.5 flex items-center justify-between ${isInEncounterChannel ? "bg-rose-900" : "bg-slate-800"}`}>
                  <h3 className="font-semibold text-white text-sm">{isInEncounterChannel ? "⚔ Encounter Room" : "Video Lobby"}</h3>
                  <span className="text-xs text-slate-300">{participantsCount} active</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  {isInEncounterChannel ? (
                    // ── ENCOUNTER SPLIT SCREEN ──────────────────────────────────
                    <div className="h-full flex">
                      {/* Own squad side */}
                      <div className="flex-1 flex flex-col min-w-0 p-3 gap-3">
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5">{ownEncounterSquadName}</span>
                          <span className="text-xs text-slate-400">{encounterSplitTiles.ownSquadTiles.length} member{encounterSplitTiles.ownSquadTiles.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div
                          className="flex-1 grid gap-2 content-start"
                          style={{
                            gridTemplateColumns: encounterSplitTiles.ownSquadTiles.length === 1
                              ? "1fr"
                              : encounterSplitTiles.ownSquadTiles.length <= 4
                              ? "repeat(2, 1fr)"
                              : "repeat(3, 1fr)",
                          }}
                        >
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

                      {/* Divider */}
                      <div className="shrink-0 w-px bg-slate-200 self-stretch" />

                      {/* Opponent squad side */}
                      <div className="flex-1 flex flex-col min-w-0 p-3 gap-3">
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-rose-700 bg-rose-50 rounded-full px-2 py-0.5">{opponentEncounterSquadName}</span>
                          <span className="text-xs text-slate-400">{encounterSplitTiles.opponentSquadTiles.length} member{encounterSplitTiles.opponentSquadTiles.length !== 1 ? "s" : ""}</span>
                        </div>
                        {encounterSplitTiles.opponentSquadTiles.length > 0 ? (
                          <div
                            className="flex-1 grid gap-2 content-start"
                            style={{
                              gridTemplateColumns: encounterSplitTiles.opponentSquadTiles.length === 1
                                ? "1fr"
                                : encounterSplitTiles.opponentSquadTiles.length <= 4
                                ? "repeat(2, 1fr)"
                                : "repeat(3, 1fr)",
                            }}
                          >
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
                          <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-rose-200 bg-rose-50">
                            <p className="text-sm text-rose-400 text-center px-4">Waiting for opponent to join encounter video...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // ── VIDEO LOBBY ──────────────────────────────────────────────
                    <div className="h-full overflow-y-auto p-4">
                      {videoTiles.filter((t) => t.presence === "In video lobby").length === 0 ? (
                        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 h-40 text-sm text-slate-400">
                          No one is in the video lobby yet
                        </div>
                      ) : (
                        <div className="grid gap-3 grid-cols-2">
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
                  )}
                </div>
              </div>

              {/* Squad Members sidebar — hidden during encounter to maximise video space */}
              {!isInEncounterChannel ? (
              <div className="w-64 shrink-0 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="shrink-0 bg-indigo-50 border-b border-indigo-100 px-4 py-2.5 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-indigo-900">Squad Members</h3>
                  <span className="text-xs text-indigo-500 font-medium">{squad.members?.length ?? 0}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {(squad.members ?? []).map((member) => {
                    const tile = videoTiles.find((t) => t.key === member.memberId);
                    const inVideo = tile?.presence === "In video lobby" || tile?.presence === "In encounter room";
                    const isMe = member.memberId === myMember?.memberId;
                    return (
                      <div key={member.memberId} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${inVideo ? "bg-emerald-500" : "bg-slate-300"}`}
                            title={inVideo ? "In video" : "Not in video"}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{member.displayName || member.userId}</div>
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${member.role === "leader" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
                                {member.role}
                              </span>
                              {member.ready ? (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">ready</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        {isLeader && member.role !== "leader" ? (
                          <div className="flex gap-1.5">
                            <button
                              className="flex-1 rounded-md bg-indigo-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                              onClick={() => onPromoteMember(member.memberId)}
                              disabled={loading || isMe}
                            >
                              Promote
                            </button>
                            <button
                              className="flex-1 rounded-md bg-rose-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                              onClick={() => onKickMember(member.memberId)}
                              disabled={loading || isMe}
                            >
                              Kick
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
              ) : null}

            </div>
          </div>
        )}

        {message ? <p className="shrink-0 text-sm text-slate-600 pt-1">{message}</p> : null}
      </div>
    </main>
  );
}
