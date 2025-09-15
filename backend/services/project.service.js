import mongoose from "mongoose";
import projectModel from "../models/project.model.js";

export const createProject = async ({ name, userId }) => {
  if (!name) throw new Error("Name is required");
  if (!userId) throw new Error("UserId is required");

  try {
    const project = await projectModel.create({
      name,
      users: [userId], // ✅ always array
    });

    return project;
  } catch (error) {
    if (error.code === 11000) {
      throw new Error("Project name already exists");
    }
    throw error;
  }
};

export const fetchAllProjects = async (userId) => {
  try {
    const projects = await projectModel.find({ users: userId });
    return projects;
  } catch (error) {
    throw error;
  }
};

export const addUserToProject = async ({ users, projectId, userId }) => {
  try {
    if (!mongoose.isValidObjectId(projectId)) {
      throw new Error("Invalid Project ID");
    }

    if (!projectId) throw new Error("Project not found");

    // Validate users array
    if (!users || !Array.isArray(users) || users.length === 0) {
      throw new Error("Users are required and must be a non-empty array");
    }
    for (const userId of users) {
      if (!mongoose.isValidObjectId(userId)) {
        throw new Error(`Invalid user ID: ${userId}`);
      }
    }

    if (!userId) throw new Error("userId not found");

    if (!mongoose.isValidObjectId(userId)) {
      throw new Error("Invalid User ID");
    }

    const project = await projectModel.findOne({
      _id: projectId,
      users: userId,
    });

    if (!project) {
      throw new Error("Project not found");
    }
    const updatedProject = await projectModel.findOneAndUpdate(
      { _id: projectId },
      { $addToSet: { users: { $each: users } } },
      { new: true }
    );
    return updatedProject;
  } catch (error) {
    throw error;
  }
};

export const fetchProjectById = async ({ projectId }) => {
  try {
    if (!projectId) {
      throw new Error("Project not found");
    }

    if (!mongoose.isValidObjectId(projectId)) {
      throw new Error("Invalid Project ID");
    }
    const project = await projectModel.findById(projectId).populate("users");

    return project;
  } catch (error) {
    throw error;
  }
};
