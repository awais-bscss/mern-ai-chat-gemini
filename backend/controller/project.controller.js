import { createProject as createProjectService } from "../services/project.service.js";
import { validationResult } from "express-validator";
import userModel from "../models/user.model.js";

const createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name } = req.body;
    // const loggedInUser = await userModel.findById(req.user._id);
    // const userId = loggedInUser._id;
    const userId = req.user._id;

    const project = await createProjectService({ name, userId });

    res.status(201).json({ message: "Project created successfully", project });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export { createProject };
