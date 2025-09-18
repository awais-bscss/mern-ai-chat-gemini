import http from "http";
import app from "./app.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import projectModel from "./models/project.model.js";
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
        token = authHeader; // agar sirf token bheja ho without Bearer
      }
    }

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const projectId = socket.handshake.query.projectId;
    if (!mongoose.isValidObjectId(projectId)) {
      return next(new Error("Invalid project ID"));
    }

    // ✅ Project check
    const project = await projectModel.findById(projectId);
    if (!project) {
      return next(new Error("Project not found"));
    }

    // ✅ Verify JWT
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
  console.log("Client connected:", socket.user?.email || socket.user?._id);

  // ✅ Join project-specific room
  socket.join(socket.project._id.toString());

  // ✅ Listen for messages
  socket.on("event-message", (data) => {
    console.log(" Message received:", data);

    // Broadcast to same project room
    io.to(socket.project._id.toString()).emit("event-message", {
      ...data,
      sender: socket.user, // sender ka data bhej do
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
});
