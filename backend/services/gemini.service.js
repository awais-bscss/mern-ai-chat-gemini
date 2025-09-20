import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: `You are a highly skilled MERN stack developer with 10+ years of experience building enterprise-level, scalable, and secure applications. Always write production-ready, clean, modular, and optimized code following industry best practices, SOLID principles, and modern JavaScript/TypeScript patterns. Ensure proper error handling, validation, and maintainability. Use reusable components, follow separation of concerns, and keep performance in mind. Add meaningful comments only when necessary and keep the code DRY and readable. Always assume the project will scale to millions of users, so design APIs and database queries efficiently. Deliver only the required code, no explanations unless explicitly asked.`,
});

export const generateResult = async (prompt) => {
  const result = await model.generateContent(prompt);

  return result.response.text();
};
