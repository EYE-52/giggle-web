import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = (squadId: string) => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.on("connect", () => {
      console.log("Connected to WebSocket server");
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
