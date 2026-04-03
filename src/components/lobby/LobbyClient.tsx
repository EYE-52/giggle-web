"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { VideoTile } from "@/components/lobby/VideoTile";

type Props = {
  backendToken: string;
  userName: string;
  userImage?: string | null;
};

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

              <div className="grid gap-2 md:grid-cols-2">
                {(squad.members || []).map((member) => (
                  <div key={member.memberId} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="font-medium">{member.displayName || member.userId}</div>
                    <div className="text-slate-500">Role: {member.role}</div>
                    <div className={member.ready ? "text-emerald-700" : "text-amber-700"}>
                      {member.ready ? "Ready" : "Not ready"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg bg-indigo-600 text-white px-4 py-2 disabled:opacity-50"
                  onClick={onToggleReady}
                  disabled={loading || !myMember}
                >
                  {myMember?.ready ? "Set Not Ready" : "Set Ready"}
                </button>

                <button
                  className="rounded-lg bg-slate-900 text-white px-4 py-2 disabled:opacity-50"
                  onClick={onJoinLobbyVideo}
                  disabled={joiningAgora || joined}
                >
                  {joined ? "Lobby Connected" : "Join Lobby Video"}
                </button>

                <button
                  className="rounded-lg bg-slate-200 text-slate-900 px-4 py-2 disabled:opacity-50"
                  onClick={() => leaveLobby()}
                  disabled={!joined}
                >
                  Leave Video
                </button>

                <button
                  className="rounded-lg bg-amber-500 text-white px-4 py-2 disabled:opacity-50"
                  onClick={() => toggleMic()}
                  disabled={!joined}
                >
                  {isMicOn ? "Mic Off" : "Mic On"}
                </button>

                <button
                  className="rounded-lg bg-cyan-600 text-white px-4 py-2 disabled:opacity-50"
                  onClick={() => toggleVideo()}
                  disabled={!joined}
                >
                  {isVideoOn ? "Video Off" : "Video On"}
                </button>

                <button
                  className="rounded-lg bg-emerald-600 text-white px-4 py-2 disabled:opacity-50"
                  onClick={onStartSearch}
                  disabled={loading || !isLeader || !allReady || squad.status !== "idle"}
                >
                  Start Matchmaking (Leader)
                </button>

                <button
                  className="rounded-lg bg-rose-600 text-white px-4 py-2 disabled:opacity-50"
                  onClick={onLeaveSquad}
                  disabled={loading}
                >
                  Leave Squad
                </button>
              </div>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Video Lobby</h3>
                <span className="text-sm text-slate-500">Participants: {participantsCount}</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <VideoTile label="You" track={localVideoTrack} />
                {remoteUsers.map((user) => (
                  <VideoTile
                    key={String(user.uid)}
                    label={uidToDisplayName.get(Number(user.uid)) || `Member ${user.uid}`}
                    track={user.videoTrack || null}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </div>
    </main>
  );
}
