import { backendRequest } from "@/lib/api/client";
import type { AgoraLobbyToken, SquadContextResponse, SquadState } from "@/types/giggle";

type CreateOrJoinResponse = {
  squadId: string;
  squadCode: string;
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

export const startSearch = (token: string, squadId: string) => {
  return backendRequest<SearchResponse>(`/api/squads/${squadId}/search`, {
    method: "POST",
    token,
  });
};

export const leaveSquad = (token: string, squadId: string) => {
  return backendRequest<{ message: string }>(`/api/squads/${squadId}/leave`, {
    method: "POST",
    token,
  });
};

export const getLobbyToken = (token: string, squadId: string) => {
  return backendRequest<AgoraLobbyToken>(`/api/agora/lobby-token/${squadId}`, {
    method: "POST",
    token,
  });
};
