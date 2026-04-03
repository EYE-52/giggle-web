export type SquadStatus = "idle" | "searching" | "matched" | "in_encounter";

export type SquadRole = "leader" | "member";

export type SquadMember = {
  memberId: string;
  userId: string;
  providerAccountId: string;
  displayName?: string;
  role: SquadRole;
  ready: boolean;
  joinedAt: string;
};

export type SquadState = {
  squadId: string;
  squadCode: string;
  status: SquadStatus;
  members: SquadMember[];
  leaderMemberId?: string;
};

export type SquadContextResponse = {
  inSquad: boolean;
  squadId?: string;
  squadCode?: string;
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
