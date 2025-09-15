import jwt from "jsonwebtoken";
import redisClient from "../services/redis.service.js";
import userModel from "../models/user.model.js";

export const authUser = async (req, res, next) => {
  try {
    let token;

    // 1. Authorization header
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.replace("Bearer", "").trim();
    }

    // 2. Cookie fallback
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    // 3. Token missing
    if (!token) {
      return res.status(401).json({ error: "Unauthorized - No token" });
    }

    // 4. Check blacklist
    const isBlacklisted = await redisClient.get(token);
    if (isBlacklisted) {
      res.clearCookie("token");
      return res
        .status(401)
        .json({ error: "Unauthorized - Token blacklisted" });
    }

    // 5. Verify + find user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded._id);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized - User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
