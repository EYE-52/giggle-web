export type SquadStatus = "idle" | "searching" | "matched" | "in_encounter";

export type SquadRole = "leader" | "member";

export type SquadMember = {
  memberId: string;
  userId: string;
  providerAccountId: string;
  displayName?: string;
  role: SquadRole;
  ready: boolean;
  inLobbyVideo?: boolean;
  joinedAt: string;
};

export type SquadState = {
  squadId: string;
  squadCode: string;
  squadName: string;
  status: SquadStatus;
  members: SquadMember[];
  leaderMemberId?: string;
};

export type SquadContextResponse = {
  inSquad: boolean;
  squadId?: string;
  squadCode?: string;
  squadName?: string;
  status?: SquadStatus;
  members?: SquadMember[];
  member?: SquadMember;
  leaderMemberId?: string | null;
};

export type AgoraLobbyToken = {
  squadId: string;
  memberId: string;
  appId: string;
  channelName: string;
  rtcToken: string;
  uid: number;
  expiresIn: number;
  expiresAt: string;
};

export type MatchmakingQueueInfo = {
  region: string;
  size: number;
  queuedAt: string;
  waitSeconds: number;
};

export type MatchmakingMatchInfo = {
  encounterId: string;
  opponentSquadId: string;
  ownSquadName: string;
  opponentSquadName: string;
  matchedAt: string;
  status: "awaiting_ack" | "active" | "ended";
};

export type MatchmakingStatusResponse = {
  squadId: string;
  state: SquadStatus;
  queue: MatchmakingQueueInfo | null;
  match: MatchmakingMatchInfo | null;
};

export type EncounterHandoffResponse = {
  encounterId: string;
  status: "awaiting_ack" | "active" | "ended";
  squadAId: string;
  squadAName: string;
  squadBId: string;
  squadBName: string;
  ack: Record<string, boolean>;
  expiresAt: string;
};

export type UpdateSquadNameResponse = {
  squadId: string;
  squadName: string;
};

export type EncounterAckResponse = {
  encounterId: string;
  squadId: string;
  acknowledged: boolean;
  allAcked: boolean;
};

export type EncounterTokenResponse = {
  encounterId: string;
  squadId: string;
  memberId: string;
  appId: string;
  channelName: string;
  rtcToken: string;
  uid: number;
  expiresIn: number;
  expiresAt: string;
};
