// project.controller.js
import mongoose from "mongoose";
import projectModel from "../models/project.model.js";

export const createProject = async ({ name, userId }) => {
  if (!name) throw new Error("Name is required");
  if (!userId || !mongoose.isValidObjectId(userId))
    throw new Error("Invalid User ID");
  try {
    const project = await projectModel.create({
      name,
      users: [userId],
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
  if (!mongoose.isValidObjectId(userId)) throw new Error("Invalid User ID");
  try {
    const projects = await projectModel.find({ users: userId });
    return projects;
  } catch (error) {
    throw error;
  }
};

export const addUserToProject = async ({ users, projectId, userId }) => {
  if (!mongoose.isValidObjectId(projectId))
    throw new Error("Invalid Project ID");
  if (!Array.isArray(users) || users.length === 0)
    throw new Error("Users are required and must be a non-empty array");
  users.forEach((uid) => {
    if (!mongoose.isValidObjectId(uid))
      throw new Error(`Invalid user ID: ${uid}`);
  });
  if (!userId || !mongoose.isValidObjectId(userId))
    throw new Error("Invalid User ID");
  const project = await projectModel.findOne({ _id: projectId, users: userId });
  if (!project) throw new Error("Project not found or user not authorized");
  const updatedProject = await projectModel.findByIdAndUpdate(
    projectId,
    { $addToSet: { users: { $each: users } } },
    { new: true }
  );
  return updatedProject;
};

export const fetchProjectById = async ({ projectId, userId }) => {
  if (!projectId || !mongoose.isValidObjectId(projectId))
    throw new Error("Invalid Project ID");
  if (!userId || !mongoose.isValidObjectId(userId))
    throw new Error("Invalid User ID");
  const project = await projectModel
    .findOne({ _id: projectId, users: userId })
    .populate("users");
  if (!project) throw new Error("Project not found or user not authorized");
  return project;
};

export const updateFiles = async ({ projectId, files, userId }) => {
  if (!mongoose.isValidObjectId(projectId))
    throw new Error("Invalid Project ID");
  if (!userId || !mongoose.isValidObjectId(userId))
    throw new Error("Invalid User ID");
  if (!Array.isArray(files)) throw new Error("Files must be an array");
  const project = await projectModel.findOne({ _id: projectId, users: userId });
  if (!project) throw new Error("Project not found or user not authorized");
  project.currentFiles = files;
  await project.save();
  return project;
};
