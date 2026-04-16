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
  indigo: "bg-[#516051] text-white",
  slate: "bg-[#eef2ec] text-[#1b1c1a]",
  amber: "bg-[#d6a83d] text-white",
  cyan: "bg-[#2aa9b6] text-white",
  emerald: "bg-[#3f765f] text-white",
  rose: "bg-[#c53947] text-white",
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
  const allInLobbyVideo = squad && squad.members && squad.members.length > 0 && squad.members.every((member) => member.inLobbyVideo);
  const allReady = squad && squad.members && squad.members.length > 0 && squad.members.every((member) => member.ready === true);
  const canStartSearch = allInLobbyVideo && allReady;
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

  // Auto-acknowledge encounters when matched (skip "Confirm Match" button).
  // As soon as a match is found, immediately acknowledge so the encounter
  // transitions to "active" and all squad members auto-join.
  useEffect(() => {
    if (!squad || !encounterId) return;
    const isMatched = squad.status === "matched" || matchStatus?.state === "matched";
    if (!isMatched) return;
    if (handoffStatus?.status === "active") return; // already active

    let cancelled = false;

    const autoAck = async () => {
      try {
        await acknowledgeEncounter(backendToken, encounterId, squad.squadId);
        if (!cancelled) {
          const handoff = await getEncounterHandoffStatus(backendToken, encounterId);
          if (!cancelled) setHandoffStatus(handoff);
          const status = await getMatchmakingStatus(backendToken, squad.squadId);
          if (!cancelled) setMatchStatus(status);
        }
      } catch {
        // best-effort auto-ack; if it fails, will retry in next poll
      }
    };

    void autoAck();

    return () => {
      cancelled = true;
    };
  }, [backendToken, encounterId, handoffStatus?.status, matchStatus?.state, squad]);

  useEffect(() => {
    if (!encounterId || !squad || joiningAgora) return;
    const encounterReady = handoffStatus?.status === "active" && (squad.status === "in_encounter" || matchStatus?.state === "in_encounter");
    if (!encounterReady) return;

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

  // When encounter ends, auto-rejoin lobby channel for members who were in the encounter
  useEffect(() => {
    if (!joined || !currentChannelName?.startsWith("encounter_")) return;
    if (matchStatus?.match?.encounterId) {
      // Encounter is still active
      return;
    }
    
    // Encounter has ended and we're still in the old encounter channel.
    // Leave encounter and rejoin lobby if we have members in the encounter.
    const autoRejoinLobby = async () => {
      try {
        setJoiningAgora(true);
        // Leave old encounter channel
        await leaveLobby();
        autoJoinedEncounterRef.current = null;
        await setEncounterVideoPresence(backendToken, squad?.squadId ?? "", false).catch(() => {});
        
        // Rejoin lobby channel
        const tokenData = await getLobbyToken(backendToken, squad?.squadId ?? "");
        await joinLobby({
          appId: tokenData.appId,
          channelName: tokenData.channelName,
          token: tokenData.rtcToken,
          uid: tokenData.uid,
        });
        await setLobbyVideoPresence(backendToken, squad?.squadId ?? "", true).catch(() => {});
      } catch (error) {
        // Silently handle errors; UI still functional
      } finally {
        setJoiningAgora(false);
      }
    };

    void autoRejoinLobby();
  }, [joined, currentChannelName, matchStatus?.match?.encounterId, backendToken, squad?.squadId, leaveLobby, joinLobby]);


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

  const onDisconnectEncounter = async () => {
    if (!squad || !encounterId) return;
    setLoading(true);

    try {
      const result = await disconnectEncounter(backendToken, squad.squadId, encounterId);
      
      // Return to lobby
      await leaveLobby();
      autoJoinedEncounterRef.current = null;
      await setEncounterVideoPresence(backendToken, squad.squadId, false).catch(() => {});

      // Rejoin lobby
      const tokenData = await getLobbyToken(backendToken, squad.squadId);
      await joinLobby({
        appId: tokenData.appId,
        channelName: tokenData.channelName,
        token: tokenData.rtcToken,
        uid: tokenData.uid,
      });
      await setLobbyVideoPresence(backendToken, squad.squadId, true).catch(() => {});
      await refreshSquad(squad.squadId);
      const status = await getMatchmakingStatus(backendToken, squad.squadId);
      setMatchStatus(status);
      setHandoffStatus(null);
      setMessage("Encounter disconnected. Your squad returned to the lobby.");
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message || "Failed to disconnect encounter");
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

      const tokenData = await getLobbyToken(backendToken, squad.squadId);
      await joinLobby({
        appId: tokenData.appId,
        channelName: tokenData.channelName,
        token: tokenData.rtcToken,
        uid: tokenData.uid,
      });
      await setLobbyVideoPresence(backendToken, squad.squadId, true).catch(() => {});

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
    <main className="h-screen flex flex-col landing-shell overflow-hidden">
      <header className="shrink-0 landing-header border-b border-[rgba(255,255,255,0.1)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {userImage ? (
            <img src={userImage} alt="profile" className="h-8 w-8 rounded-full" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-[#516051] flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {userName?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <p className="text-xs text-[#f0f2ec]">Giggle Phase 1 Lobby Demo</p>
            <h1 className="font-semibold text-sm">Welcome, {userName}</h1>
          </div>
        </div>
        <button className="text-sm text-white" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      <div className="flex-1 overflow-hidden p-4">
        {!squad ? (
          <section className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-8">
            <div className="rounded-2xl landing-card border p-4 space-y-3">
              <h2 className="font-semibold">Create Squad</h2>
              <input
                className="w-full rounded-lg border border-[#c5c9c1] p-2"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
              />
              <button
                className="w-full rounded-lg bg-[#516051] text-white py-2 disabled:opacity-50"
                onClick={onCreateSquad}
                disabled={loading}
              >
                Create Squad
              </button>
            </div>

            <div className="rounded-2xl landing-card border p-4 space-y-3">
              <h2 className="font-semibold">Join Squad</h2>
              <input
                className="w-full rounded-lg border border-[#c5c9c1] p-2 uppercase"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="ABC-123"
              />
              <button
                className="w-full rounded-lg bg-[#697969] text-white py-2 disabled:opacity-50"
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
            <div className="w-72 shrink-0 flex flex-col overflow-hidden rounded-2xl border landing-card shadow-sm">
              <div className="shrink-0 landing-header px-4 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-white text-sm">Squad</h2>
                <span className="text-xs bg-[#7f9b8f] text-[#f7faf6] rounded-full px-2 py-0.5">{squad.status}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">

              <div className="text-xs">
                Squad: <span className="font-semibold">{squad.squadName}</span>
              </div>

              <div className="text-xs">
                Invite code: <span className="font-semibold">{squad.squadCode}</span>
              </div>

              <div className="text-xs text-[#3e443d] rounded-lg border border-[var(--border)] bg-[#efeeeb] p-2">
                Match state: <span className="font-medium">{matchStatus?.state || squad.status}</span>
                {matchStatus?.queue ? ` | Queue wait: ${matchStatus.queue.waitSeconds}s` : ""}
                {encounterId ? ` | Encounter: ${encounterId}` : ""}
              </div>

              {encounterId && matchStatus?.match ? (
                <div className="text-xs text-[#3b5f57] rounded-lg border border-[#cde2da] bg-[#eef5f1] p-2">
                  Encounter room: <span className="font-semibold">{matchStatus.match.ownSquadName}</span>
                  {" vs "}
                  <span className="font-semibold">{matchStatus.match.opponentSquadName}</span>
                </div>
              ) : null}

              {isLeader ? (
                <div className="rounded-xl landing-panel border border-[var(--border)] p-3 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-[#4a5d4f]">Squad Name</div>
                  <input
                    className="w-full rounded-lg border border-[#c5c9c1] p-2 text-sm"
                    value={newSquadName}
                    onChange={(e) => setNewSquadName(e.target.value)}
                    placeholder={squad.squadName}
                    maxLength={32}
                  />
                  <button
                    className="w-full rounded-lg bg-[#516051] px-3 py-2 text-sm text-white disabled:opacity-50"
                    onClick={onUpdateSquadName}
                    disabled={loading || newSquadName.trim().length < 2}
                  >
                    Save
                  </button>
                </div>
              ) : null}

              <div className="rounded-xl landing-panel border border-[var(--border)] p-3 space-y-3">
                <div className="text-xs uppercase tracking-wide text-[#4a5d4f]">Quick Controls</div>
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
                      title={!canStartSearch ? "All members must be ready and in the video lobby" : "Start matchmaking"}
                      onClick={onStartSearch}
                      disabled={loading || !canStartSearch}
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
                {/* <div className="text-xs text-slate-500">
                  Hover an icon to see action name. {isLeader ? "Matchmaking is leader-only." : ""}
                </div> */}
              </div>


            </div>
            </div>

            {/* RIGHT: Video Lobby + Squad Members side by side */}
            <div className="flex-1 flex gap-4 overflow-hidden">

              {/* Video Lobby / Encounter Room */}
              <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border landing-card shadow-sm">
                <div className={`shrink-0 px-4 py-2.5 flex items-center justify-between ${isInEncounterChannel ? "landing-danger" : "landing-header"}`}>
                  <h3 className="font-semibold text-white text-sm">{isInEncounterChannel ? "⚔ Encounter Room" : "Video Lobby"}</h3>
                  <span className="text-xs text-[#f0f2ec]">{participantsCount} active</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  {isInEncounterChannel ? (
                    // ── ENCOUNTER SPLIT SCREEN ──────────────────────────────────
                    <div className="h-full flex">
                      {/* Own squad side */}
                      <div className="flex-1 flex flex-col min-w-0 p-3 gap-3">
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-[#35513f] bg-[#eef2ec] rounded-full px-2 py-0.5">{ownEncounterSquadName}</span>
                          <span className="text-xs text-[#6a6c63]">{encounterSplitTiles.ownSquadTiles.length} member{encounterSplitTiles.ownSquadTiles.length !== 1 ? "s" : ""}</span>
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
                      <div className="shrink-0 w-px bg-[#d8d8d0] self-stretch" />

                      {/* Opponent squad side */}
                      <div className="flex-1 flex flex-col min-w-0 p-3 gap-3">
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-[#944147] bg-[#f9dedf] rounded-full px-2 py-0.5">{opponentEncounterSquadName}</span>
                          <span className="text-xs text-[#6a6c63]">{encounterSplitTiles.opponentSquadTiles.length} member{encounterSplitTiles.opponentSquadTiles.length !== 1 ? "s" : ""}</span>
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
                          <div className="flex-1 flex items-center justify-center rounded-xl border border-[#f4c4c6] bg-[#fdeaef]">
                            <p className="text-sm text-[#b5414d] text-center px-4">Waiting for opponent to join encounter video...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // ── VIDEO LOBBY ──────────────────────────────────────────────
                    <div className="h-full overflow-y-auto p-4">
                      {videoTiles.filter((t) => t.presence === "In video lobby").length === 0 ? (
                        <div className="flex items-center justify-center rounded-xl border border-dashed border-[#c5c9c1] bg-[#efeeeb] h-40 text-sm text-[#6a6c63]">
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
              <div className="w-64 shrink-0 flex flex-col overflow-hidden rounded-2xl border landing-card shadow-sm">
                <div className="shrink-0 bg-[#eef2ec] border-b border-[#d8d8d0] px-4 py-2.5 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-[#35513f]">Squad Members</h3>
                  <span className="text-xs text-[#4a6b5f] font-medium">{squad.members?.length ?? 0}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {(squad.members ?? []).map((member) => {
                    const tile = videoTiles.find((t) => t.key === member.memberId);
                    const inVideo = tile?.presence === "In video lobby" || tile?.presence === "In encounter room";
                    const isMe = member.memberId === myMember?.memberId;
                    return (
                      <div key={member.memberId} className="rounded-lg border border-[var(--border)] bg-[#efeeeb] px-2 py-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${inVideo ? "bg-emerald-500" : "bg-[#c5c9c1]"}`}
                            title={inVideo ? "In video" : "Not in video"}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{member.displayName || member.userId}</div>
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${member.role === "leader" ? "bg-[#eef2ec] text-[#35513f]" : "bg-[#f1f2ed] text-[#6a6c63]"}`}>
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
                              className="flex-1 rounded-md bg-[#516051] px-2 py-1 text-xs text-white disabled:opacity-50"
                              onClick={() => onPromoteMember(member.memberId)}
                              disabled={loading || isMe}
                            >
                              Promote
                            </button>
                            <button
                              className="flex-1 rounded-md bg-[#c53947] px-2 py-1 text-xs text-white disabled:opacity-50"
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

        {message ? <p className="shrink-0 text-sm text-[#4a544a] pt-1">{message}</p> : null}
      </div>
    </main>
  );
}
