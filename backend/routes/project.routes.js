import express from "express";
const router = express.Router();
import * as projectController from "../controller/project.controller.js";
import { body } from "express-validator";
import * as authMiddleware from "../middlewares/auth.middleware.js";

router.post(
  "/create",
  [
    authMiddleware.authUser,
    body("name").isString().not().isEmpty().withMessage("Name is Required"),
  ],
  projectController.createProject
);

export default router;
