import {
  createProject as createProjectService,
  fetchAllProjects,
  addUserToProject as addUserToProjectService,
} from "../services/project.service.js";

import { validationResult } from "express-validator";
import userModel from "../models/user.model.js";

export const createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name } = req.body;
    const userId = req.user._id;

    const project = await createProjectService({ name, userId });

    res.status(201).json({ message: "Project created successfully", project });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllProjects = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user._id;
    const projects = await fetchAllProjects(userId);

    res.status(200).json({
      message: "Projects fetched successfully",
      projects,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const addUserToProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { users, projectId } = req.body;
    const loggedInUser = await userModel.findOne({
      email: req.user.email,
    });

    const project = await addUserToProjectService({
      projectId,
      users,
      userId: loggedInUser._id,
    });

    res.status(200).json({
      message: "User added to project successfully",
      project,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
