import dotenv from "dotenv";
dotenv.config();
import express from "express";
const app = express();
import morgan from "morgan";
import connectDB from "./db/db.js";
connectDB();
import userRoutes from "./routes/user.routes.js";

//middlewares
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/users", userRoutes);

export default app;
