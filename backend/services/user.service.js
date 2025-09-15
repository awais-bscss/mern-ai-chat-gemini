import userModel from "../models/user.model.js";
const createUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }
  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    throw new Error("User already exists");
  }
  const hashedPassword = await userModel.hashPassword(password);
  const newUser = userModel.create({ email, password: hashedPassword });

  return newUser;
};

const getAllUsersService = async ({ userId }) => {
  const users = await userModel
    .find({
      _id: { $ne: userId },
    })
    .select("-password");
  return users;
};

export default { createUser, getAllUsersService };
