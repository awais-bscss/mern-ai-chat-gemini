import dotenv from "dotenv";
dotenv.config();
import express from "express";
const app = express();
import morgan from "morgan";
import connectDB from "./db/db.js";
connectDB();
import userRoutes from "./routes/user.routes.js";
import projectRoutes from "./routes/project.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
app.use(
  cors({
    origin: "http://localhost:5174",
    credentials: true,
  })
);

//middlewares
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/users", userRoutes);
app.use("/projects", projectRoutes);

export default app;
