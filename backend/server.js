import http from "http";
import app from "./app.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import projectModel from "./models/project.model.js";
import { generateResult } from "./services/gemini.service.js";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ Authentication middleware
io.use(async (socket, next) => {
  try {
    const authHeader =
      socket.handshake.auth?.token ||
      socket.handshake.headers["authorization"] ||
      socket.handshake.headers["x-token"] ||
      socket.handshake.headers["token"];

    let token;
    if (authHeader) {
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      } else {
        token = authHeader;
      }
    }

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const projectId = socket.handshake.query.projectId;
    if (!mongoose.isValidObjectId(projectId)) {
      return next(new Error("Invalid project ID"));
    }

    const project = await projectModel.findById(projectId);
    if (!project) {
      return next(new Error("Project not found"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = decoded;
    socket.project = project;

    next();
  } catch (error) {
    console.error("Socket Auth Error:", error.message);
    next(error);
  }
});

io.on("connection", (socket) => {
  const roomId = socket.project._id.toString();

  console.log(" Client connected:", socket.user?.email || socket.user?._id);

  socket.join(roomId);

  // Notify others
  io.to(roomId).emit("user-joined", {
    user: socket.user,
    message: `${socket.user.email} joined the project`,
  });

  //  Listen for messages
  socket.on("event-message", async (data) => {
    console.log("📥 Message received:", data);
    const message = (data.message || "").trim();

    //  Pehle user ka asli message sabko bhej do
    io.to(roomId).emit("event-message", {
      ...data,
      sender: socket.user,
    });

    //  Agar @ai present hai to ek alag se AI Bot ka reply bhejo
    if (message.includes("@ai")) {
      const prompt = message.replace("@ai", "");

      const reply = await generateResult(prompt);
      io.to(roomId).emit("event-message", {
        ...data,
        sender: {
          _id: "ai",
          email: "AI Bot",
        },
        message: reply,
      });
    }
  });

  // ❌ Handle disconnect
  socket.on("disconnect", () => {
    console.log(
      "❌ Client disconnected:",
      socket.user?.email || socket.user?._id
    );

    socket.leave(roomId);

    io.to(roomId).emit("user-left", {
      user: socket.user,
      message: `${socket.user.email} left the project`,
    });
  });
});

server.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
});
