import { io, Socket } from "socket.io-client";
import { BACKEND_URL } from "@/config/appConfig";

let socket: Socket | null = null;

export const getSocket = (backendToken?: string) => {
  if (!socket) {
    socket = io(BACKEND_URL, {
      withCredentials: true,
      autoConnect: false,
      auth: backendToken ? { token: backendToken } : undefined,
    });
  } else if (backendToken) {
    socket.auth = { token: backendToken };
  }
  return socket;
};

export const connectSocket = (squadId: string, backendToken: string) => {
  const s = getSocket(backendToken);
  if (!s.connected) {
    s.off("connect");
    s.connect();
    s.on("connect", () => {
      s.emit("join_squad", squadId);
    });
  } else {
    s.emit("join_squad", squadId);
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
