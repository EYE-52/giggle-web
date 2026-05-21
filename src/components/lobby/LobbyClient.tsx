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
  updateSquadTags,
} from "@/lib/api/squad";
import { BackendApiError } from "@/lib/api/client";
import type { EncounterHandoffResponse, MatchmakingStatusResponse, SquadState } from "@/types/giggle";
import { useSquadLobbyAgora } from "@/lib/agora/useSquadLobbyAgora";
import { CameraStateIcon, MicStateIcon, VideoTile } from "@/components/lobby/VideoTile";
import { ThemeToggle } from "@/components/ThemeToggle";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";

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
  indigo: "bg-[#516051] dark:bg-[#697969] text-white",
  slate: "bg-[#eef2ec] dark:bg-gray-700 text-[#1b1c1a] dark:text-gray-200",
  amber: "bg-[#d6a83d] dark:bg-yellow-600 text-white",
  cyan: "bg-[#2aa9b6] dark:bg-cyan-600 text-white",
  emerald: "bg-[#3f765f] dark:bg-emerald-600 text-white",
  rose: "bg-[#c53947] dark:bg-red-600 text-white",
};

function ActionIconButton({ label, title, onClick, disabled, tone, icon }: ActionIconButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl disabled:opacity-50 ${toneClassMap[tone]}`}
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={label}
    >
      {icon}
      <span className="text-[10px] leading-tight font-medium text-center whitespace-nowrap">{label}</span>
    </motion.button>
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
  tags?: string[];
}): SquadState => {
  return {
    squadId: data.squadId,
    squadCode: data.squadCode,
    squadName: data.squadName,
    status: data.status,
    members: data.members,
    leaderMemberId: data.leaderMemberId || undefined,
    tags: data.tags || [],
  };
};

const getVibeColors = (tags: string[] = []) => {
  const mapping: Record<string, string> = {
    gaming: "#1e3a8a",   // deep blue
    music: "#581c87",    // deep purple
    deeptalk: "#134e4a", // deep teal
    college: "#78350f",  // deep amber
    party: "#831843",    // deep pink
    chill: "#1e293b",    // slate
  };
  
  const colors = tags
    .map(t => mapping[t.toLowerCase()])
    .filter(Boolean);
    
  if (colors.length === 0) return ["#0f172a", "#111827"]; 
  if (colors.length === 1) return [colors[0], "#0f172a"];
  return colors.slice(0, 2);
};

export function LobbyClient({ backendToken, userName, userImage }: Props) {
  const [displayName, setDisplayName] = useState(userName || "");
  const [newSquadName, setNewSquadName] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [squad, setSquad] = useState<SquadState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [joiningAgora, setJoiningAgora] = useState(false);
  const [matchStatus, setMatchStatus] = useState<MatchmakingStatusResponse | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<EncounterHandoffResponse | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState(0);

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
    speakingUsers,
    networkQuality,
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
      const isSpeaking = speakingUsers.has(uid);
      const quality = networkQuality[uid] || networkQuality[0] || 0;
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
        isSpeaking,
        networkQuality: quality,
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
          isBlurred: isRevealing,
          isSpeaking: speakingUsers.has(numericUid),
          networkQuality: networkQuality[numericUid] || 0,
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
    isRevealing,
    speakingUsers,
    networkQuality,
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
      const isSpeaking = speakingUsers.has(uid);
      const quality = networkQuality[uid] || networkQuality[0] || 0;
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
        isSpeaking,
        networkQuality: quality,
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
          isBlurred: isRevealing,
          isSpeaking: speakingUsers.has(numericUid),
          networkQuality: networkQuality[numericUid] || 0,
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
    isRevealing,
    speakingUsers,
    networkQuality,
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

  const refreshMatchStatus = useCallback(async () => {
    if (!squad?.squadId) return;
    try {
      const status = await getMatchmakingStatus(backendToken, squad.squadId);
      setMatchStatus(status);

      const activeEncounterId = status.match?.encounterId;
      if (activeEncounterId) {
        const handoff = await getEncounterHandoffStatus(backendToken, activeEncounterId);
        setHandoffStatus(handoff);
      } else {
        setHandoffStatus(null);
      }
    } catch {
      setMatchStatus(null);
      setHandoffStatus(null);
    }
  }, [backendToken, squad?.squadId]);

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
            tags: result.tags,
          })
        );
      } catch (error) {
        const err = error as BackendApiError;
        setMessage(err.message || "Failed to load squad context");
      }
    };

    void load();
  }, [backendToken]);

  // WebSocket Setup
  useEffect(() => {
    if (!squad?.squadId) return;

    const socket = connectSocket(squad.squadId);

    socket.on("MATCH_FOUND", (data) => {
      console.log("Match found event received:", data);
      setMessage(`Match found with ${data.opponentSquadName}!`);
      void refreshMatchStatus();
      void refreshSquad(squad.squadId);
    });

    socket.on("ENCOUNTER_ACTIVE", (data) => {
      console.log("Encounter active event received:", data);
      void refreshMatchStatus();
      void refreshSquad(squad.squadId);
    });

    socket.on("ENCOUNTER_ENDED", (data) => {
      console.log("Encounter ended event received:", data);
      setMessage("Encounter ended.");
      setMatchStatus(null);
      setHandoffStatus(null);
      void refreshSquad(squad.squadId);
    });

    socket.on("SQUAD_UPDATED", () => {
      void refreshSquad(squad.squadId);
    });

    return () => {
      socket.off("MATCH_FOUND");
      socket.off("ENCOUNTER_ACTIVE");
      socket.off("ENCOUNTER_ENDED");
      socket.off("SQUAD_UPDATED");
      disconnectSocket();
    };
  }, [squad?.squadId, refreshMatchStatus, refreshSquad]);

  // Fallback Polling (Reduced frequency)
  useEffect(() => {
    if (!squad?.squadId) return;

    const intervalId = setInterval(() => {
      void refreshMatchStatus();
      void refreshSquad(squad.squadId);
    }, 10000); // 10 seconds fallback

    return () => clearInterval(intervalId);
  }, [refreshMatchStatus, refreshSquad, squad?.squadId]);


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

  // Trigger reveal when entering encounter
  const prevChannelRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentChannelName?.startsWith("encounter_") && !prevChannelRef.current?.startsWith("encounter_")) {
      setIsRevealing(true);
      setRevealCountdown(3);
      const timer = setInterval(() => {
        setRevealCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsRevealing(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    prevChannelRef.current = currentChannelName;
  }, [currentChannelName]);


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

  const onUpdateTags = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!squad || !isLeader || !tagInput.trim()) return;

    setLoading(true);
    try {
      const newTags = [...(squad.tags || []), tagInput.trim().substring(0, 15)].slice(-5);
      await updateSquadTags(backendToken, squad.squadId, newTags);
      await refreshSquad(squad.squadId);
      setTagInput("");
    } catch (error) {
      const err = error as BackendApiError;
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onRemoveTag = async (tagToRemove: string) => {
    if (!squad || !isLeader) return;

    setLoading(true);
    try {
      const newTags = (squad.tags || []).filter(t => t !== tagToRemove);
      await updateSquadTags(backendToken, squad.squadId, newTags);
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
      setMessage("Matchmaking started.");
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

  const vibeColors = useMemo(() => getVibeColors(squad?.tags), [squad?.tags]);

  return (
    <motion.main 
      animate={{ 
        background: `radial-gradient(circle at top left, ${vibeColors[0]}, ${vibeColors[1]})` 
      }}
      transition={{ duration: 2 }}
      className="h-screen flex flex-col landing-shell overflow-hidden"
    >
      <header className="shrink-0 landing-header border-b border-[rgba(255,255,255,0.1)] dark:border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="text-white font-black text-2xl tracking-tighter">giggle.</div>
          <div className="w-px h-8 bg-white/10 hidden md:block" />
          <div className="flex items-center gap-3">
            {userImage ? (
              <img src={userImage} alt="profile" className="h-8 w-8 rounded-full" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[#516051] dark:bg-[#697969] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {userName?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <p className="text-[10px] text-[#f0f2ec] dark:text-gray-300 font-bold uppercase tracking-widest opacity-60">High-Scale Session</p>
              <h1 className="font-semibold text-sm text-white dark:text-gray-100">Welcome, {userName}</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button className="text-sm text-white dark:text-gray-200 hover:text-gray-300 dark:hover:text-gray-100" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-4">
        {!squad ? (
          <section className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-8">
            <div className="rounded-2xl landing-card border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Create Squad</h2>
              <input
                className="w-full rounded-lg border border-[#c5c9c1] dark:border-gray-600 bg-white dark:bg-gray-700 p-2 text-gray-900 dark:text-gray-100"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
              />
              <button
                className="w-full rounded-lg bg-[#516051] dark:bg-[#697969] text-white py-2 disabled:opacity-50 hover:bg-opacity-90 dark:hover:bg-opacity-80"
                onClick={onCreateSquad}
                disabled={loading}
              >
                Create Squad
              </button>
            </div>

            <div className="rounded-2xl landing-card border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Join Squad</h2>
              <input
                className="w-full rounded-lg border border-[#c5c9c1] dark:border-gray-600 bg-white dark:bg-gray-700 p-2 uppercase text-gray-900 dark:text-gray-100"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="ABC-123"
              />
              <button
                className="w-full rounded-lg bg-[#697969] dark:bg-gray-600 text-white py-2 disabled:opacity-50 hover:bg-opacity-90 dark:hover:bg-opacity-80"
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
            <div className="w-72 shrink-0 flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 landing-card shadow-sm bg-white dark:bg-gray-800">
              <div className="shrink-0 landing-header px-4 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-white text-sm">Squad</h2>
                <span className="text-xs bg-[#7f9b8f] dark:bg-gray-600 text-[#f7faf6] dark:text-gray-200 rounded-full px-2 py-0.5">{squad.status}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">

              <div className="text-xs text-gray-600 dark:text-gray-400">
                Squad: <span className="font-semibold text-gray-900 dark:text-gray-100">{squad.squadName}</span>
              </div>

              <div className="text-xs text-gray-600 dark:text-gray-400">
                Invite code: <span className="font-semibold text-gray-900 dark:text-gray-100">{squad.squadCode}</span>
              </div>

              {/* Tag Display */}
              <div className="flex flex-wrap gap-1 mt-1">
                {(squad.tags || []).map(tag => (
                  <span key={tag} className="text-[10px] bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                    #{tag}
                    {isLeader && (
                      <button onClick={() => onRemoveTag(tag)} className="hover:text-rose-500">×</button>
                    )}
                  </span>
                ))}
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 rounded-lg border border-[var(--border)] dark:border-gray-600 bg-[#efeeeb] dark:bg-gray-700/50 p-2">
                Match state: <span className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">{matchStatus?.state || squad.status}</span>
                {matchStatus?.queue ? ` | Region: ${matchStatus.queue.region}` : ""}
                {encounterId ? ` | Enc: ${encounterId.slice(-4)}` : ""}
              </div>

              {encounterId && matchStatus?.match ? (
                <div className="text-xs text-emerald-700 dark:text-emerald-400 rounded-lg border border-[#cde2da] dark:border-emerald-600/50 bg-[#eef5f1] dark:bg-emerald-900/20 p-2">
                  Collision: <span className="font-bold text-gray-900 dark:text-gray-100">{matchStatus.match.ownSquadName}</span>
                  {" vs "}
                  <span className="font-bold text-gray-900 dark:text-gray-100">{matchStatus.match.opponentSquadName}</span>
                </div>
              ) : null}

              {isLeader ? (
                <div className="rounded-xl landing-panel border border-[var(--border)] dark:border-gray-600 bg-white dark:bg-gray-700 p-3 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-[#4a5d4f] dark:text-gray-300 font-bold">Leader Controls</div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase">Squad Name</label>
                    <div className="flex gap-1">
                      <input
                        className="flex-1 rounded-lg border border-[#c5c9c1] dark:border-gray-600 bg-white dark:bg-gray-600 p-1.5 text-xs text-gray-900 dark:text-gray-100"
                        value={newSquadName}
                        onChange={(e) => setNewSquadName(e.target.value)}
                        placeholder={squad.squadName}
                        maxLength={32}
                      />
                      <button
                        className="rounded-lg bg-[#516051] dark:bg-[#697969] px-2 py-1 text-[10px] text-white disabled:opacity-50"
                        onClick={onUpdateSquadName}
                        disabled={loading || newSquadName.trim().length < 2}
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase">Vibe Tags (Interests)</label>
                    <form onSubmit={onUpdateTags} className="flex gap-1">
                      <input
                        className="flex-1 rounded-lg border border-[#c5c9c1] dark:border-gray-600 bg-white dark:bg-gray-600 p-1.5 text-xs text-gray-900 dark:text-gray-100"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="e.g. Gaming"
                        maxLength={15}
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-sky-600 px-2 py-1 text-[10px] text-white disabled:opacity-50"
                        disabled={loading || !tagInput.trim() || (squad.tags || []).length >= 5}
                      >
                        Add
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl landing-panel border border-[var(--border)] dark:border-gray-600 bg-white dark:bg-gray-700 p-3 space-y-3">
                <div className="text-xs uppercase tracking-wide text-[#4a5d4f] dark:text-gray-300">Quick Controls</div>
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
                    disabled={joiningAgora}
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
              </div>


            </div>
            </div>

            {/* RIGHT: Video Lobby + Squad Members side by side */}
            <div className="flex-1 flex gap-4 overflow-hidden">

              {/* Video Lobby / Encounter Room */}
              <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 landing-card shadow-sm bg-white dark:bg-gray-800">
                <div className={`shrink-0 px-4 py-2.5 flex items-center justify-between ${isInEncounterChannel ? "landing-danger" : "landing-header"}`}>
                  <h3 className="font-semibold text-white text-sm">{isInEncounterChannel ? "⚔ Encounter Room" : "Video Lobby"}</h3>
                  <span className="text-xs text-[#f0f2ec] dark:text-gray-300">{participantsCount} active</span>
                </div>
                <div className="flex-1 overflow-hidden relative">
                  <AnimatePresence>
                    {isRevealing && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-xl transition-opacity duration-1000"
                      >
                        <div className="flex items-center gap-8 mb-8">
                          <motion.div
                            initial={{ x: -200, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className="text-right"
                          >
                            <p className="text-sky-400 text-xs uppercase tracking-widest font-bold mb-1">Your Squad</p>
                            <h2 className="text-4xl font-black text-white uppercase italic">{ownEncounterSquadName}</h2>
                          </motion.div>

                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", delay: 0.5 }}
                            className="bg-white text-gray-900 w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                          >
                            VS
                          </motion.div>

                          <motion.div
                            initial={{ x: 200, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className="text-left"
                          >
                            <p className="text-rose-400 text-xs uppercase tracking-widest font-bold mb-1">Opponent</p>
                            <h2 className="text-4xl font-black text-white uppercase italic">{opponentEncounterSquadName}</h2>
                          </motion.div>
                        </div>

                        <motion.div 
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          key={revealCountdown}
                          className="text-9xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]"
                        >
                          {revealCountdown}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {isInEncounterChannel ? (
                    // ── ENCOUNTER SPLIT SCREEN ──────────────────────────────────
                    <div className="h-full flex">
                      {/* Own squad side */}
                      <div className="flex-1 flex flex-col min-w-0 p-3 gap-3">
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-[#35513f] dark:text-green-400 bg-[#eef2ec] dark:bg-green-900 rounded-full px-2 py-0.5">{ownEncounterSquadName}</span>
                          <span className="text-xs text-[#6a6c63] dark:text-gray-400">{encounterSplitTiles.ownSquadTiles.length} member{encounterSplitTiles.ownSquadTiles.length !== 1 ? "s" : ""}</span>
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
                              isSpeaking={tile.isSpeaking}
                              networkQuality={tile.networkQuality}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="shrink-0 w-px bg-[#d8d8d0] self-stretch" />

                      {/* Opponent squad side */}
                      <div className="flex-1 flex flex-col min-w-0 p-3 gap-3">
                        <div className="shrink-0 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-[#944147] dark:text-red-400 bg-[#f9dedf] dark:bg-red-900 rounded-full px-2 py-0.5">{opponentEncounterSquadName}</span>
                            <span className="text-xs text-[#6a6c63] dark:text-gray-400">{encounterSplitTiles.opponentSquadTiles.length} member{encounterSplitTiles.opponentSquadTiles.length !== 1 ? "s" : ""}</span>
                          </div>
                          {isLeader && (
                            <button 
                              onClick={() => {
                                if (confirm("Report this squad for inappropriate behavior?")) {
                                  getSocket().emit("report_squad", { squadId: matchStatus?.match?.opponentSquadId, reason: "Manual Report" });
                                  setMessage("Squad reported. Our moderators are reviewing.");
                                }
                              }}
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-400 uppercase tracking-tighter"
                            >
                              Report
                            </button>
                          )}
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
                                isBlurred={tile.isBlurred}
                                isSpeaking={tile.isSpeaking}
                                networkQuality={tile.networkQuality}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center rounded-xl border border-[#f4c4c6] dark:border-red-600 bg-[#fdeaef] dark:bg-red-900">
                            <p className="text-sm text-[#b5414d] dark:text-red-300 text-center px-4">Waiting for opponent to join encounter video...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // ── VIDEO LOBBY ──────────────────────────────────────────────
                    <div className="h-full overflow-y-auto p-4">
                      {videoTiles.filter((t) => t.presence === "In video lobby").length === 0 ? (
                        <div className="flex items-center justify-center rounded-xl border border-dashed border-[#c5c9c1] dark:border-gray-600 bg-[#efeeeb] dark:bg-gray-700 h-40 text-sm text-[#6a6c63] dark:text-gray-400">
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
                                isSpeaking={tile.isSpeaking}
                                networkQuality={tile.networkQuality}
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
              <div className="w-64 shrink-0 flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 landing-card shadow-sm bg-white dark:bg-gray-800">
                <div className="shrink-0 bg-[#eef2ec] dark:bg-gray-700 border-b border-[#d8d8d0] dark:border-gray-600 px-4 py-2.5 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-[#35513f] dark:text-gray-200">Squad Members</h3>
                  <span className="text-xs text-[#4a6b5f] dark:text-gray-300 font-medium">{squad.members?.length ?? 0}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {(squad.members ?? []).map((member) => {
                      const tile = videoTiles.find((t) => t.key === member.memberId);
                      const inVideo = tile?.presence === "In video lobby" || tile?.presence === "In encounter room";
                      const isMe = member.memberId === myMember?.memberId;
                      return (
                        <motion.div 
                          layout
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: 20, opacity: 0 }}
                          key={member.memberId} 
                          className="rounded-lg border border-[var(--border)] dark:border-gray-600 bg-[#efeeeb] dark:bg-gray-700 px-2 py-2 space-y-1.5 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${inVideo ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-[#c5c9c1] dark:bg-gray-500"}`}
                              title={inVideo ? "In video" : "Not in video"}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">{member.displayName || member.userId}</div>
                              <div className="flex gap-1 mt-0.5 flex-wrap">
                                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-bold ${member.role === "leader" ? "bg-[#516051] text-white" : "bg-white/50 dark:bg-black/20 text-gray-600 dark:text-gray-400"}`}>
                                  {member.role}
                                </span>
                                {member.ready ? (
                                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400">ready</span>
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
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
              ) : null}

            </div>
          </div>
        )}

        {message ? <p className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 pt-2 animate-pulse">{message}</p> : null}
      </div>
    </motion.main>
  );
}
