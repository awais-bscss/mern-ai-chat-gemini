// config/socket.js
import { io } from "socket.io-client";

let socket;

export const initializeSocket = (projectId) => {
  socket = io(import.meta.env.VITE_API_URL, {
    auth: {
      token: localStorage.getItem("token"),
    },
    query: { projectId },
  });

  socket.on("connect", () => {
    console.log("✅ Connected to socket server:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected from socket server");
  });

  return socket;
};

export const sendMessage = (eventName, data) => {
  if (socket) {
    console.log("📤 Sending:", eventName, data);
    socket.emit(eventName, data);
  }
};

export const receiveMessage = (eventName, callback) => {
  if (socket) {
    socket.on(eventName, callback);
  }
};
