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

router.get("/all", [authMiddleware.authUser], projectController.getAllProjects);

router.put(
  "/add-user",
  [
    authMiddleware.authUser,

    // Project ID validate karo
    body("projectId")
      .isString()
      .notEmpty()
      .withMessage("Project ID is required and must be a string"),

    // Users array validate karo
    body("users")
      .isArray({ min: 1 })
      .withMessage("Users field must be an array with at least one user"),
    body("users.*")
      .isString()
      .withMessage("Each user in the array must be a string"),
  ],
  projectController.addUserToProject
);
export default router;
