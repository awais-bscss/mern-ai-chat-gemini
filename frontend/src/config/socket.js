import { io } from "socket.io-client";

let socket = null;

export const initializeSocket = (projectId) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io("http://localhost:5000", {
    query: { projectId },
    auth: {
      token: localStorage.getItem("token"),
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    // console.log(`✅ Connected to socket server: ${socket.id}`);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  socket.on("disconnect", () => {
    // console.log("❌ Disconnected from socket server");
  });

  return socket;
};

export const sendMessage = (event, data) => {
  if (socket && socket.connected) {
    console.log(`📤 Sending: ${event}`, data);
    socket.emit(event, data);
  } else {
    console.error("Socket not connected");
  }
};

export const receiveMessage = (event, callback) => {
  if (socket) {
    socket.on(event, callback);
  }
};
