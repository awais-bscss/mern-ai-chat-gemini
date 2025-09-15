import { Router } from "express";
const router = Router();
import * as userController from "../controller/user.controller.js";
import { body } from "express-validator";
import * as authMiddleware from "../middlewares/auth.middleware.js";

router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Invalid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  userController.registerUser
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  userController.loginUser
);

router.get("/profile", [authMiddleware.authUser], userController.profileUser);

router.post("/logout", [authMiddleware.authUser], userController.logoutUser);

router.get("/all", [authMiddleware.authUser], userController.getAllUsers);

export default router;
