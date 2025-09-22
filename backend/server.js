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
      token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;
    }

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const projectId = socket.handshake.query.projectId;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new Error("Invalid project ID"));
    }

    const project = await projectModel.findById(projectId).lean();
    if (!project) {
      return next(new Error("Project not found"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    socket.project = project;

    next();
  } catch (error) {
    console.error("Socket Auth Error:", error.message);
    next(new Error("Authentication failed"));
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

  // Listen for messages
  socket.on("event-message", async (data) => {
    console.log("📥 Message received:", data);
    const message = (data.message || "").trim();

    if (!message) return;

    // Send user's message to all
    const userMessage = {
      ...data,
      sender: socket.user,
      timestamp: new Date(),
    };
    io.to(roomId).emit("event-message", userMessage);

    // Handle @ai command
    if (message.includes("@ai")) {
      const prompt = message.replace("@ai", "").trim();
      if (prompt) {
        try {
          console.log("Sending prompt to AI:", prompt); // Debug prompt
          const reply = await generateResult(prompt);
          console.log("AI Reply:", reply); // Debug AI response
          const aiMessage = {
            ...data,
            sender: { _id: "ai", email: "AI Bot" },
            message: reply,
            timestamp: new Date(),
          };
          io.to(roomId).emit("event-message", aiMessage);
        } catch (error) {
          console.error("AI Generation Error:", error.message);
          io.to(roomId).emit("event-message", {
            ...data,
            sender: { _id: "ai", email: "AI Bot" },
            message: {
              error: "AI response generation failed: " + error.message,
            },
            timestamp: new Date(),
          });
        }
      }
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(
      "❌ Client disconnected:",
      socket.user?.email || socket.user?._id
    );
    socket.leave(roomId);
    io.to(roomId).emit("user-left", {
      user: socket.user,
      message: `${socket.user.email} left the project`,
      timestamp: new Date(),
    });
  });
});

server.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
});
