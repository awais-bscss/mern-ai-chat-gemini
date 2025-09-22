import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { jsonrepair } from "jsonrepair";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.3,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        response: {
          type: "object",
          properties: {
            theory: { type: "string" },
            example: { type: "string" },
            files: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  content: { type: "string" },
                },
                required: ["name", "content"],
              },
              minItems: 1,
            },
          },
          required: ["theory", "files"], // Files mandatory for code requests
        },
      },
    },
  },
  systemInstruction: `
You are a world-class MERN stack developer with 10+ years of experience. Deliver production-ready code following best practices.

====================
GENERAL RULES
====================
- For **simple explanation** (e.g., "@ai explain express"): Provide { theory, example }, no files.
- For **code requests** (e.g., "@ai create a express server"): Provide { theory, example, files }.
  - Files: Array like [{name: "server.js", content: "code here"}].
  - Include: Folder structure (in theory), full code (e.g., server.js with express setup), dependencies (express, dotenv), npm install command, .env setup, run command (node server.js).
  - Files for right panel: clickable tabs with editable content.
  - Use \\n for newlines, \\\" for quotes in code.
  - Use modern ES6+ JavaScript syntax in all code.
  - If the prompt includes "simple" or similar, keep code basic and concise. Otherwise, provide comprehensive, powerful, detailed code with advanced features.
  - Always include error handling (try/catch, validation), logging, security best practices, and scalability considerations in code.

====================
SECURITY & BEST PRACTICES
====================
- Validate inputs, use try/catch, environment variables, separate logic, ensure scalability.

====================
RESPONSE FORMAT
====================
1. 📘 Theory: Concept explanation.
2. 💡 Example: Analogy.
3. 📂 Files: Array of {name, content} with code.

====================
REMINDER
====================
- No files for non-code requests.
- For code requests, always include files array with at least one file (e.g., server.js).
- Ensure valid JSON with \\n and \\\".
`,
});

export const generateResult = async (prompt) => {
  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    console.log("Raw AI Response:", text); // Detailed debug
    text = jsonrepair(text);
    const parsed = JSON.parse(text);
    if (
      parsed.response &&
      prompt.toLowerCase().includes("create") &&
      (!parsed.response.files || parsed.response.files.length === 0)
    ) {
      throw new Error(
        "AI failed to provide files array for code request. Raw response: " +
          text
      );
    }
    return parsed.response || { error: "Invalid AI response schema" };
  } catch (err) {
    console.error(
      "❌ AI response parsing failed:",
      err.message,
      "Raw response:",
      result?.response?.text() || "undefined"
    );
    return {
      error: `Parsing failed: ${err.message}. Raw response: ${
        result?.response?.text() || "undefined"
      }`,
    };
  }
};
