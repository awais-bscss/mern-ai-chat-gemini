import userModel from "../models/user.model.js";
import userService from "../services/user.service.js";
import { validationResult } from "express-validator";
import redisClient from "../services/redis.service.js";
export const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;
  try {
    const newUser = await userService.createUser({ email, password });
    const token = newUser.generateJWT();
    res
      .status(201)
      .json({ message: "User registered successfully", token, user: newUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;
  try {
    const user = await userModel.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    const isMatch = await user.isValidPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = user.generateJWT();
    res
      .status(200)
      .json({ message: "User logged in successfully", token, user });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const profileUser = async (req, res) => {
  res.status(200).json({ message: "User profile", user: req.user || null });
};

export const logoutUser = async (req, res) => {
  try {
    let token;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ error: "Unauthorized - No token provided" });
    }
    await redisClient.set(token, "logout", "EX", 60 * 60 * 24);
    res.clearCookie("token");
    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
};
