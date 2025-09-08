import projectModel from "../models/project.model.js";

export const createProject = async ({ name, userId }) => {
  if (!name) throw new Error("Name is Required");
  if (!userId) throw new Error("UserId is Required");

  try {
    const project = await projectModel.create({
      name,
      users: userId,
    });

    return project;
  } catch (error) {
    if (error.code === 11000) {
      throw new Error("Project name must be unique");
    }

    throw error;
  }
};
