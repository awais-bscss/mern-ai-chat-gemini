// project.router.js
import express from "express";
import { body, validationResult } from "express-validator";
import * as projectController from "../controller/project.controller.js";
import * as authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post(
  "/create",
  [
    authMiddleware.authUser,
    body("name").isString().not().isEmpty().withMessage("Name is Required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const project = await projectController.createProject({
      name: req.body.name,
      userId: req.user._id,
    });
    res.status(201).json({ project });
  })
);

router.get(
  "/all",
  [authMiddleware.authUser],
  asyncHandler(async (req, res) => {
    const projects = await projectController.fetchAllProjects(req.user._id);
    res.json({ projects });
  })
);

router.put(
  "/add-user",
  [
    authMiddleware.authUser,
    body("projectId")
      .isString()
      .notEmpty()
      .withMessage("Project ID is required and must be a string"),
    body("users")
      .isArray({ min: 1 })
      .withMessage("Users field must be an array with at least one user"),
    body("users.*")
      .isString()
      .withMessage("Each user in the array must be a string"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const updatedProject = await projectController.addUserToProject({
      users: req.body.users,
      projectId: req.body.projectId,
      userId: req.user._id,
    });
    res.json(updatedProject);
  })
);

router.get(
  "/get-project/:projectId",
  [authMiddleware.authUser],
  asyncHandler(async (req, res) => {
    const project = await projectController.fetchProjectById({
      projectId: req.params.projectId,
      userId: req.user._id,
    });
    res.json({ project });
  })
);

router.put(
  "/update-files",
  [
    authMiddleware.authUser,
    body("projectId")
      .isString()
      .notEmpty()
      .withMessage("Project ID is required"),
    body("files").isArray().withMessage("Files must be an array"),
    body("files.*.name")
      .isString()
      .notEmpty()
      .withMessage("File name is required"),
    body("files.*.content")
      .isString()
      .withMessage("File content must be a string"),
    body("files.*.language")
      .isString()
      .notEmpty()
      .withMessage("File language is required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const updatedProject = await projectController.updateFiles({
      projectId: req.body.projectId,
      files: req.body.files,
      userId: req.user._id,
    });
    res.json(updatedProject);
  })
);

export default router;
