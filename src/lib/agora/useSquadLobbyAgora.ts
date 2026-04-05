"use client";

import { useCallback, useMemo, useState } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";

type JoinArgs = {
  appId: string;
  channelName: string;
  token: string;
  uid: number;
};

const getRemoteUsers = (client: IAgoraRTCClient): IAgoraRTCRemoteUser[] => {
  return [...client.remoteUsers];
};

export const useSquadLobbyAgora = () => {
  const [client] = useState<IAgoraRTCClient>(() =>
    AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
  );
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [joined, setJoined] = useState(false);
  const [currentChannelName, setCurrentChannelName] = useState<string | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);

  const bindClientEvents = useCallback(() => {
    client.removeAllListeners();

    client.on("user-joined", () => {
      setRemoteUsers(getRemoteUsers(client));
    });

    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === "audio") {
        user.audioTrack?.play();
      }
      setRemoteUsers(getRemoteUsers(client));
    });

    client.on("user-unpublished", (user, mediaType) => {
      if (mediaType === "audio") {
        user.audioTrack?.stop();
      }
      setRemoteUsers(getRemoteUsers(client));
    });

    client.on("user-left", () => {
      setRemoteUsers(getRemoteUsers(client));
    });
  }, [client]);

  const joinLobby = useCallback(
    async ({ appId, channelName, token, uid }: JoinArgs) => {
      if (joined) return;

      bindClientEvents();
      const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();

      await client.join(appId, channelName, token, uid);
      await client.publish([micTrack, camTrack]);

      setLocalAudioTrack(micTrack);
      setLocalVideoTrack(camTrack);
      setRemoteUsers(getRemoteUsers(client));
      setIsMicOn(true);
      setIsVideoOn(true);
      setCurrentChannelName(channelName);
      setJoined(true);
    },
    [bindClientEvents, client, joined]
  );

  const toggleMic = useCallback(async () => {
    if (!joined || !localAudioTrack) return;
    const next = !isMicOn;
    await localAudioTrack.setEnabled(next);
    setIsMicOn(next);
  }, [isMicOn, joined, localAudioTrack]);

  const toggleVideo = useCallback(async () => {
    if (!joined || !localVideoTrack) return;
    const next = !isVideoOn;
    await localVideoTrack.setEnabled(next);
    setIsVideoOn(next);
  }, [isVideoOn, joined, localVideoTrack]);

  const leaveLobby = useCallback(async () => {
    if (!joined) return;

    localAudioTrack?.stop();
    localAudioTrack?.close();
    localVideoTrack?.stop();
    localVideoTrack?.close();

    await client.leave();

    setLocalAudioTrack(null);
    setLocalVideoTrack(null);
    setIsMicOn(true);
    setIsVideoOn(true);
    setCurrentChannelName(null);
    setJoined(false);
  }, [client, joined, localAudioTrack, localVideoTrack]);

  const participantsCount = useMemo(() => {
    const local = joined ? 1 : 0;
    return local + remoteUsers.length;
  }, [joined, remoteUsers.length]);

  return {
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
  };
};
