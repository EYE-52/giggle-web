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
import { Users, Zap, Info, MessageSquare, Video, ChevronRight, ChevronLeft, Maximize, Minimize } from "lucide-react";

type Props = {
  backendToken: string;
  userName: string;
  userImage?: string | null;
  isPremium?: boolean;
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

export function LobbyClient({ backendToken, userName, userImage, isPremium = false }: Props) {
  const [displayName, setDisplayName] = useState(userName || "");
  const [newSquadName, setNewSquadName] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [squad, setSquad] = useState<SquadState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingSafetyFlagSquadId, setPendingSafetyFlagSquadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [joiningAgora, setJoiningAgora] = useState(false);
  const [matchStatus, setMatchStatus] = useState<MatchmakingStatusResponse | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<EncounterHandoffResponse | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState(0);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => {
    if (!isFullScreen) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      }
      setIsChatCollapsed(true);
      setIsSidebarCollapsed(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullScreen(!isFullScreen);
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullScreenChange);
  }, []);

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
        // Hide ready status in encounter
        ready: isInEncounterChannel ? undefined : member.ready,
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
      const onlineText = isInEncounterChannel ? "In discovery room" : "In video lobby";
      const offlineText = isInEncounterChannel ? "Not in discovery room" : "Not in video lobby";
      // If we are not in Agora ourselves, use the backend-tracked inLobbyVideo flag
      const remoteOnline = joined ? Boolean(remoteUser) : Boolean(member.inLobbyVideo);
      const presence = isSelf ? (joined ? onlineText : offlineText) : remoteOnline ? onlineText : offlineText;

      return {
        key: member.memberId,
        label: member.displayName || uidToDisplayName.get(uid) || member.userId,
        role: member.role,
        // Hide ready status in encounter
        ready: isInEncounterChannel ? undefined : member.ready,
        presence,
        micOn,
        track,
        showVideo,
        isSpeaking,
        networkQuality: quality,
      };
    });

    // Determine which squad in handoffStatus is the opponent
    const isSquadA = handoffStatus?.squadAId === squad.squadId;
    const opponentMembers = isSquadA ? handoffStatus?.squadBMembers : handoffStatus?.squadAMembers;

    const mappedOpponentUids = new Set<number>();
    const opponentSquadTiles = (opponentMembers || []).map((member) => {
      const uid = hashStringToUid(`${uidScope}:${member.userId}`);
      mappedOpponentUids.add(uid);
      const remoteUser = remoteUsersByUid.get(uid);
      const isSpeaking = speakingUsers.has(uid);
      const quality = networkQuality[uid] || 0;

      return {
        key: member.memberId,
        label: member.displayName,
        role: member.role,
        ready: undefined,
        presence: remoteUser ? "In discovery room" : "Joining...",
        micOn: Boolean(remoteUser?.audioTrack),
        track: remoteUser?.videoTrack || null,
        showVideo: Boolean(remoteUser?.videoTrack),
        isBlurred: isRevealing,
        isSpeaking,
        networkQuality: quality,
      };
    });

    // Fallback for unexpected remote users not in the handoff list
    const extraOpponentTiles = remoteUsers
      .filter((remoteUser) => {
        const uid = Number(remoteUser.uid);
        return !knownUids.has(uid) && !mappedOpponentUids.has(uid);
      })
      .map((remoteUser) => {
        const numericUid = Number(remoteUser.uid);
        return {
          key: `discovery-${numericUid}`,
          label: `Friend ${String(numericUid).slice(-4)}`,
          role: "member",
          ready: undefined,
          presence: "In discovery room",
          micOn: Boolean(remoteUser.audioTrack),
          track: remoteUser.videoTrack || null,
          showVideo: Boolean(remoteUser.videoTrack),
          isBlurred: isRevealing,
          isSpeaking: speakingUsers.has(numericUid),
          networkQuality: networkQuality[numericUid] || 0,
        };
      });

    return { ownSquadTiles, opponentSquadTiles: [...opponentSquadTiles, ...extraOpponentTiles] };
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
    handoffStatus,
  ]);

  const ownEncounterSquadName = matchStatus?.match?.ownSquadName || squad?.squadName || "Your squad";
  const opponentSquadId =
    matchStatus?.match?.opponentSquadId ||
    (handoffStatus
      ? handoffStatus.squadAId === squad?.squadId
        ? handoffStatus.squadBId
        : handoffStatus.squadAId
      : undefined);
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
    if (!squad?.squadId || !backendToken) return;

    const socket = connectSocket(squad.squadId, backendToken);

    const onMatchFound = (data: { opponentSquadName?: string }) => {
      setMessage(`Match found with ${data.opponentSquadName}!`);
      void refreshMatchStatus();
      void refreshSquad(squad.squadId);
    };

    const onEncounterActive = () => {
      void refreshMatchStatus();
      void refreshSquad(squad.squadId);
    };

    const onEncounterEnded = () => {
      setMessage("Encounter ended.");
      setMatchStatus(null);
      setHandoffStatus(null);
      setChatMessages([]);
      void refreshSquad(squad.squadId);
    };

    const onNewMessage = (msg: unknown) => {
      setChatMessages((prev) => [...prev, msg].slice(-50));
    };

    const onSquadUpdated = () => {
      void refreshSquad(squad.squadId);
    };

    socket.on("MATCH_FOUND", onMatchFound);
    socket.on("ENCOUNTER_ACTIVE", onEncounterActive);
    socket.on("ENCOUNTER_ENDED", onEncounterEnded);
    socket.on("new_message", onNewMessage);
    socket.on("SQUAD_UPDATED", onSquadUpdated);

    return () => {
      socket.off("MATCH_FOUND", onMatchFound);
      socket.off("ENCOUNTER_ACTIVE", onEncounterActive);
      socket.off("ENCOUNTER_ENDED", onEncounterEnded);
      socket.off("new_message", onNewMessage);
      socket.off("SQUAD_UPDATED", onSquadUpdated);
      disconnectSocket();
    };
  }, [backendToken, squad?.squadId, refreshMatchStatus, refreshSquad]);

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
        
        getSocket(backendToken).emit("join_encounter", encounterId);

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
    matchStatus?.state,
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

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const onSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !encounterId || !myMember) return;

    getSocket(backendToken).emit("send_message", {
      encounterId,
      text: chatInput.trim(),
      senderName: myMember.displayName,
      senderId: myMember.userId,
      squadId: squad?.squadId,
    });
    setChatInput("");
  };

  const onSafetyFlag = () => {
    if (!opponentSquadId) {
      setMessage("No opponent squad is available to flag.");
      return;
    }

    if (pendingSafetyFlagSquadId !== opponentSquadId) {
      setPendingSafetyFlagSquadId(opponentSquadId);
      setMessage("Tap Safety Flag again to send this squad for review.");
      return;
    }

    getSocket(backendToken).emit("report_squad", {
      squadId: opponentSquadId,
      reason: "Manual Flag",
    });
    setPendingSafetyFlagSquadId(null);
    setMessage("Safety flag sent. Our team is looking into it.");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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

    const parsedTag = tagInput.trim().substring(0, 15).toLowerCase();
    const premiumTags = ["vip", "dating", "local", "premium"];
    
    if (premiumTags.includes(parsedTag) && !isPremium) {
      setMessage(`The tag #${parsedTag} is reserved for Giggle Premium squads.`);
      return;
    }

    setLoading(true);
    try {
      const newTags = [...(squad.tags || []), parsedTag].slice(-5);
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
      await disconnectEncounter(backendToken, squad.squadId, encounterId);
      setMessage("Encounter disconnected. Returning to lobby...");
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
      setMessage("Skipping encounter... Finding next squad.");
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
      <header className="shrink-0 landing-header border-b border-[rgba(255,255,255,0.1)] dark:border-gray-700 px-4 md:px-6 py-3 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="text-white font-black text-xl md:text-2xl tracking-tighter">giggle.</div>
          <div className="w-px h-8 bg-white/10 hidden md:block" />
          <div className="flex items-center gap-3">
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userImage} alt="profile" className="h-7 w-7 md:h-8 md:w-8 rounded-full" />
            ) : (
              <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-[#516051] dark:bg-[#697969] flex items-center justify-center text-white text-xs md:text-sm font-semibold shrink-0">
                {userName?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <p className="text-[10px] text-[#f0f2ec] dark:text-gray-300 font-bold uppercase tracking-widest opacity-60">Discovery Session</p>
              <h1 className="font-semibold text-xs md:text-sm text-white dark:text-gray-100 flex items-center gap-2">

                <span className="truncate max-w-[100px] md:max-w-none">Welcome, {userName}</span>
                {isPremium && <span className="bg-gradient-to-r from-amber-200 to-amber-500 text-amber-900 text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded uppercase tracking-widest">Premium</span>}
              </h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />
          <button className="text-sm text-white dark:text-gray-200 hover:text-gray-300 dark:hover:text-gray-100" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto md:overflow-hidden p-2 md:p-4">
        {!squad ? (
          <div className="min-h-full w-full flex items-center justify-center py-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 relative z-10"
            >
            {/* PATH 1: CREATE */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="group relative p-6 md:p-8 rounded-[32px] md:rounded-[40px] bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 hover:border-[#516051] dark:hover:border-[#7f9b8f] transition-all duration-500 shadow-xl"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-[#516051]/10 text-[#516051] dark:text-[#7f9b8f] flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                <Users size={28} />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2 md:mb-3">Initiate a Squad</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm leading-relaxed mb-6 md:mb-8">
                Start a new lobby and generate a code. Invite your best friends to prepare for your first discovery match.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Lobby Display Name</label>
                  <input
                    className="w-full rounded-xl md:rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 md:p-4 text-sm font-bold text-gray-900 dark:text-white focus:border-[#516051] outline-none transition-colors"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter name..."
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 md:py-4 bg-[#516051] dark:bg-[#697969] text-white rounded-xl md:rounded-2xl font-black shadow-lg shadow-[#516051]/20 hover:bg-[#405040] disabled:opacity-50 transition-all text-sm md:text-base"
                  onClick={onCreateSquad}
                  disabled={loading || !displayName.trim()}
                >
                  Create Squad Lobby
                </motion.button>
              </div>
            </motion.div>

            {/* PATH 2: JOIN */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="group relative p-6 md:p-8 rounded-[32px] md:rounded-[40px] bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-2 border-gray-200 dark:border-gray-700 hover:border-[#516051]/50 transition-all duration-500 shadow-xl"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-[#516051]/10 text-[#516051] dark:text-[#7f9b8f] flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                <Zap size={28} />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2 md:mb-3">Join a Squad</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm leading-relaxed mb-6 md:mb-8">
                Received a code from a friend? Enter it below to instantly teleport into their squad lobby.
              </p>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">6-Digit Squad Code</label>
                  <input
                    className="w-full rounded-xl md:rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 md:p-4 text-sm font-black text-gray-900 dark:text-white focus:border-[#516051] outline-none uppercase transition-colors tracking-[0.2em]"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="ABC-123"
                    maxLength={7}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 md:py-4 bg-gray-900 dark:bg-gray-700 text-white rounded-xl md:rounded-2xl font-black shadow-lg hover:bg-black transition-all disabled:opacity-50 text-sm md:text-base"
                  onClick={onJoinSquad}
                  disabled={loading || inviteCode.length < 7}
                >
                  Join via Code
                </motion.button>
              </div>
            </motion.div>

            {/* Background Flair */}
            <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden rounded-3xl">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#516051]/5 dark:bg-white/5 blur-[100px] rounded-full" />
            </div>
          </motion.div>
        </div>
        ) : (
          <div className="h-full flex flex-col md:flex-row gap-4 overflow-hidden">
            {/* LEFT: Squad Section */}
            <div className="w-full md:w-72 shrink-0 flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 landing-card shadow-sm bg-white dark:bg-gray-800">
              <div className="shrink-0 landing-header px-4 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-white text-sm">Squad</h2>
                <span className="text-xs bg-[#7f9b8f] dark:bg-gray-600 text-[#f7faf6] dark:text-gray-200 rounded-full px-2 py-0.5">{squad.status}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px] md:max-h-none">

              <div className="text-xs text-gray-600 dark:text-gray-400">
                Squad: <span className="font-semibold text-gray-900 dark:text-gray-100">{squad.squadName}</span>
              </div>

              <div className="text-xs text-gray-600 dark:text-gray-400">
                Invite code: <span className="font-semibold text-gray-900 dark:text-gray-100">{squad.squadCode}</span>
              </div>

              {/* Tag Display */}
              <div className="flex flex-wrap gap-1 mt-1">
                {(squad.tags || []).map(tag => (
                  <span key={tag} className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md flex items-center gap-1">
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
                <div className="text-xs text-[#516051] dark:text-[#7f9b8f] rounded-lg border border-[#516051]/20 bg-emerald-50 dark:bg-emerald-900/20 p-2">
                  Match: <span className="font-bold">{matchStatus.match.opponentSquadName}</span>
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
                    <label className="text-[10px] text-gray-500 uppercase flex items-center justify-between">
                      <span>Vibe Tags</span>
                      {!isPremium && <span className="text-amber-500 font-bold">👑 Get Premium for VIP tags</span>}
                    </label>
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
                        className="rounded-lg bg-[#516051] px-2 py-1 text-[10px] text-white disabled:opacity-50"

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
                  {!encounterId && (
                    <>
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
                    </>
                  )}

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
                      label="Meet a Squad"
                      title={!canStartSearch ? "All members must be ready and in the video lobby" : "Start a new discovery meetup"}
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
                      label="Next Meetup"
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
            <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">

              {/* Video Lobby / Discovery Room */}
              <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 landing-card shadow-sm bg-white dark:bg-gray-800">
                <div className={`shrink-0 px-4 py-3 flex items-center justify-between transition-colors ${isInEncounterChannel ? "landing-header shadow-[0_4px_20px_rgba(81,96,81,0.3)]" : "landing-header"}`}>
                  <h3 className="font-semibold text-white text-sm">{isInEncounterChannel ? "✨ Discovery Room" : "Video Lobby"}</h3>
                  <div className="flex items-center gap-3">
                    {isInEncounterChannel && (
                      <button 
                        onClick={toggleFullScreen}
                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/80 hover:text-white"
                        title={isFullScreen ? "Exit Fullscreen" : "Immersive Discovery Mode"}
                      >
                        {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
                      </button>
                    )}
                    <span className="text-xs text-[#f0f2ec] dark:text-gray-300">{participantsCount} active</span>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden relative min-h-[300px]">
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
                            <p className="text-emerald-400 text-xs uppercase tracking-widest font-bold mb-1">Your Squad</p>
                            <h2 className="text-4xl font-black text-white uppercase italic">{ownEncounterSquadName}</h2>
                          </motion.div>

                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", delay: 0.5 }}
                            className="bg-[#516051] text-white w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl shadow-[0_0_30px_rgba(81,96,81,0.4)] border-2 border-white/20"
                          >
                            &
                          </motion.div>

                          <motion.div
                            initial={{ x: 200, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className="text-left"
                          >
                            <p className="text-violet-400 text-xs uppercase tracking-widest font-bold mb-1">New Friends</p>
                            <h2 className="text-2xl md:text-4xl font-black text-white uppercase italic truncate max-w-[200px]">{opponentEncounterSquadName}</h2>
                          </motion.div>
                        </div>

                        <motion.div 
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          key={revealCountdown}
                          className="text-7xl md:text-9xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]"
                        >
                          {revealCountdown}
                        </motion.div>
                        <p className="mt-4 text-sm font-bold text-white/60 uppercase tracking-widest animate-pulse">Get ready to meet...</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {isInEncounterChannel ? (
                    // ── SYMMETRIC ENCOUNTER GRID ──────────────────────────────────
                    <div className="h-full flex flex-col xl:flex-row bg-black/40">

                      {/* MAIN VIDEO STAGE */}
                      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">

                        {/* LEFT: OWN SQUAD */}
                        <div className="flex-1 flex flex-col min-w-0 p-4 gap-4 border-r border-white/5">
                          <div className="shrink-0 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">Our Crew</span>
                              <h4 className="text-sm font-bold text-white/80 truncate max-w-[120px]">{ownEncounterSquadName}</h4>
                            </div>
                            <span className="text-[10px] font-bold text-white/30">{encounterSplitTiles.ownSquadTiles.length} online</span>
                          </div>

                          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            <div className={`grid gap-3 content-center h-full ${
                              encounterSplitTiles.ownSquadTiles.length <= 1 ? "grid-cols-1 max-w-xl mx-auto" : 
                              encounterSplitTiles.ownSquadTiles.length <= 2 ? "grid-cols-1" : 
                              "grid-cols-2"
                            }`}>
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
                        </div>

                        {/* CENTER DIVIDER (&) */}
                        <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                          <div className="bg-white text-[#516051] w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-[0_0_20px_rgba(255,255,255,0.2)] border-2 border-[#516051]/20 italic">
                            &
                          </div>
                        </div>

                        {/* RIGHT: NEW SQUAD */}
                        <div className="flex-1 flex flex-col min-w-0 p-4 gap-4 bg-white/[0.01]">
                          <div className="shrink-0 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">New Friends</span>
                              <h4 className="text-sm font-bold text-white/80 truncate max-w-[120px]">{opponentEncounterSquadName}</h4>
                            </div>
                            <div className="flex items-center gap-3">
                              {isLeader && (
                                <button 
                                  onClick={onSafetyFlag}
                                  className={`text-[10px] font-black transition-colors uppercase tracking-tighter ${
                                    pendingSafetyFlagSquadId === opponentSquadId
                                      ? "text-rose-300"
                                      : "text-white/20 hover:text-rose-400"
                                  }`}
                                >
                                  {pendingSafetyFlagSquadId === opponentSquadId ? "Confirm Flag" : "Safety Flag"}
                                </button>
                              )}
                              <span className="text-[10px] font-bold text-white/30">{encounterSplitTiles.opponentSquadTiles.length} online</span>
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            {encounterSplitTiles.opponentSquadTiles.length > 0 ? (
                              <div className={`grid gap-3 content-center h-full ${
                                encounterSplitTiles.opponentSquadTiles.length <= 1 ? "grid-cols-1 max-w-xl mx-auto" : 
                                encounterSplitTiles.opponentSquadTiles.length <= 2 ? "grid-cols-1" : 
                                "grid-cols-2"
                              }`}>
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
                              <div className="h-full flex items-center justify-center p-8">
                                <div className="text-center space-y-3 animate-pulse">
                                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                    <Video size={20} className="text-white/20" />
                                  </div>
                                  <p className="text-xs font-bold text-white/20 uppercase tracking-widest leading-relaxed text-center">Welcoming<br/>New Friends...</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* SQUAD CHAT PANE */}
                      <motion.div 
                        initial={false}
                        animate={{ 
                          width: isChatCollapsed ? "48px" : "320px",
                          transition: { type: "spring", stiffness: 300, damping: 30 }
                        }}
                        className="relative xl:h-full shrink-0 flex flex-col bg-black/40 backdrop-blur-3xl border-t xl:border-t-0 xl:border-l border-white/5 overflow-hidden"
                      >
                        {/* Toggle Button */}
                        <button 
                          onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 w-6 h-10 bg-[#516051] border border-white/10 rounded-full flex items-center justify-center text-white shadow-xl hover:bg-black transition-colors"
                        >
                          {isChatCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                        </button>

                        <div className={`p-3 border-b border-white/5 bg-white/5 flex items-center justify-between transition-opacity duration-300 ${isChatCollapsed ? "opacity-0" : "opacity-100"}`}>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Squad Chat</span>
                          <MessageSquare size={14} className="text-white/40" />
                        </div>
                        
                        {!isChatCollapsed ? (
                          <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                              {chatMessages.length === 0 && (
                                <div className="h-full flex items-center justify-center text-center opacity-40">
                                  <p className="text-[10px] text-white uppercase tracking-tighter">Wave hello!<br />Say hi to your new friends!</p>
                                </div>
                              )}
                              {chatMessages.map((msg) => {
                                const isMe = msg.senderId === myMember?.userId;
                                const isOwnSquad = msg.squadId === squad?.squadId;
                                return (
                                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                    <span className="text-[9px] font-bold text-white/40 mb-1 px-1">
                                      {isMe ? "You" : msg.senderName} 
                                      {!isOwnSquad && <span className="text-violet-400 ml-1">• New Squad</span>}
                                    </span>
                                    <div className={`max-w-[90%] px-3 py-2 rounded-2xl text-sm ${
                                      isOwnSquad 
                                        ? "bg-[#516051] text-white rounded-tr-none shadow-lg" 
                                        : "bg-white/10 text-white rounded-tl-none border border-white/5"
                                    }`}>
                                      {msg.text}
                                    </div>
                                  </div>
                                );
                              })}
                              <div ref={chatEndRef} />
                            </div>

                            <form onSubmit={onSendMessage} className="p-3 bg-black/40">
                              <div className="relative">
                                <input 
                                  value={chatInput}
                                  onChange={(e) => setChatInput(e.target.value)}
                                  placeholder="Type a message..."
                                  className="w-full bg-white/10 border border-white/10 rounded-xl py-2 pl-4 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#516051]/50"
                                />
                                <button 
                                  type="submit"
                                  disabled={!chatInput.trim()}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 disabled:opacity-30"
                                >
                                  <Zap size={16} />
                                </button>
                              </div>
                            </form>
                          </>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center pt-10 gap-6 opacity-40">
                             <div className="rotate-90 origin-center whitespace-nowrap text-[10px] font-black uppercase tracking-[0.3em] text-white">
                               Chat Hidden
                             </div>
                             <MessageSquare size={16} className="text-white" />
                          </div>
                        )}
                      </motion.div>
                    </div>
                  ) : (
                    // ── VIDEO LOBBY ──────────────────────────────────────────────
                    <div className="h-full overflow-y-auto p-4">
                      {videoTiles.filter((t) => t.presence === "In video lobby").length === 0 ? (
                        <div className="flex items-center justify-center rounded-xl border border-dashed border-[#c5c9c1] dark:border-gray-600 bg-[#efeeeb] dark:bg-gray-700 h-40 text-sm text-[#6a6c63] dark:text-gray-400">
                          No one is in the video lobby yet
                        </div>
                      ) : (
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
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
              <div className="w-full lg:w-64 shrink-0 flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 landing-card shadow-sm bg-white dark:bg-gray-800 max-h-64 lg:max-h-none">
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

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100]"
            >
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gray-900/90 dark:bg-white/90 backdrop-blur-xl border border-white/10 dark:border-black/10 shadow-2xl shadow-black/50">
                <div className="w-5 h-5 rounded-full bg-[#516051] flex items-center justify-center text-white">
                  <Info size={12} />
                </div>
                <p className="text-sm font-bold text-white dark:text-gray-900 whitespace-nowrap">
                  {message}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
