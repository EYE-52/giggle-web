import { backendRequest } from "@/lib/api/client";
import type {
  AgoraLobbyToken,
  EncounterAckResponse,
  EncounterHandoffResponse,
  EncounterTokenResponse,
  MatchmakingStatusResponse,
  SquadContextResponse,
  SquadState,
  UpdateSquadNameResponse,
} from "@/types/giggle";

type CreateOrJoinResponse = {
  squadId: string;
  squadCode: string;
  squadName: string;
  member: SquadState["members"][number];
  members: SquadState["members"];
  status: SquadState["status"];
};

type ReadyResponse = {
  squadId: string;
  memberId: string;
  ready: boolean;
  readyCount: number;
  totalMembers: number;
};

type SearchResponse = {
  squadId: string;
  status: SquadState["status"];
};

export const getMySquad = (token: string) => {
  return backendRequest<SquadContextResponse>("/api/squads/me", { token });
};

export const createSquad = (token: string, displayName?: string) => {
  return backendRequest<CreateOrJoinResponse>("/api/squads/create", {
    method: "POST",
    token,
    body: { displayName },
  });
};

export const joinSquad = (token: string, squadCode: string, displayName?: string) => {
  return backendRequest<CreateOrJoinResponse>("/api/squads/join", {
    method: "POST",
    token,
    body: { squadCode, displayName },
  });
};

export const getSquadById = (token: string, squadId: string) => {
  return backendRequest<SquadState>(`/api/squads/${squadId}`, { token });
};

export const setReadyState = (token: string, squadId: string, ready: boolean) => {
  return backendRequest<ReadyResponse>(`/api/squads/${squadId}/ready`, {
    method: "POST",
    token,
    body: { ready },
  });
};

export const updateSquadName = (token: string, squadId: string, squadName: string) => {
  return backendRequest<UpdateSquadNameResponse>(`/api/squads/${squadId}/name`, {
    method: "POST",
    token,
    body: { squadName },
  });
};

export const startSearch = (token: string, squadId: string) => {
  return backendRequest<SearchResponse>(`/api/squads/${squadId}/search`, {
    method: "POST",
    token,
  });
};

export const cancelSearch = (token: string, squadId: string) => {
  return backendRequest<SearchResponse>(`/api/squads/${squadId}/search/cancel`, {
    method: "POST",
    token,
  });
};

export const kickMember = (token: string, squadId: string, memberId: string) => {
  return backendRequest<{ squadId: string; kickedMemberId: string; remainingCount: number; status: SquadState["status"] }>(
    `/api/squads/${squadId}/members/${memberId}/kick`,
    {
      method: "POST",
      token,
    }
  );
};

export const promoteMember = (token: string, squadId: string, memberId: string) => {
  return backendRequest<{ squadId: string; newLeaderMemberId: string; previousLeaderMemberId: string }>(
    `/api/squads/${squadId}/members/${memberId}/promote`,
    {
      method: "POST",
      token,
    }
  );
};

export const leaveSquad = (token: string, squadId: string) => {
  return backendRequest<{ message: string }>(`/api/squads/${squadId}/leave`, {
    method: "POST",
    token,
  });
};

export const setLobbyVideoPresence = (token: string, squadId: string, inLobbyVideo: boolean) => {
  return backendRequest<{ memberId: string; inLobbyVideo: boolean }>(`/api/squads/${squadId}/lobby-video`, {
    method: "POST",
    token,
    body: { inLobbyVideo },
  });
};

export const getLobbyToken = (token: string, squadId: string) => {
  return backendRequest<AgoraLobbyToken>(`/api/agora/lobby-token/${squadId}`, {
    method: "POST",
    token,
  });
};

export const getMatchmakingStatus = (token: string, squadId: string) => {
  return backendRequest<MatchmakingStatusResponse>(`/api/matchmaking/status/${squadId}`, { token });
};

export const getEncounterHandoffStatus = (token: string, encounterId: string) => {
  return backendRequest<EncounterHandoffResponse>(`/api/matchmaking/encounters/${encounterId}`, { token });
};

export const acknowledgeEncounter = (token: string, encounterId: string, squadId: string) => {
  return backendRequest<EncounterAckResponse>(`/api/matchmaking/encounters/${encounterId}/ack`, {
    method: "POST",
    token,
    body: { squadId },
  });
};

export const skipEncounter = (token: string, squadId: string, encounterId: string) => {
  return backendRequest<{ squadId: string; previousEncounterId: string; queueStatus: string }>(`/api/matchmaking/skip`, {
    method: "POST",
    token,
    body: { squadId, encounterId },
  });
};

export const getEncounterToken = (token: string, squadId: string, encounterId: string) => {
  return backendRequest<EncounterTokenResponse>(`/api/encounters/token`, {
    method: "POST",
    token,
    body: { squadId, encounterId },
  });
};

export const disconnectEncounter = (token: string, squadId: string, encounterId: string) => {
  return backendRequest<{ encounterId: string; memberId: string; disconnected: boolean; squadStatus: string }>(
    `/api/encounters/disconnect`,
    {
      method: "POST",
      token,
      body: { squadId, encounterId },
    }
  );
};
