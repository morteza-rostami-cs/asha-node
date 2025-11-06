import dotenv from "dotenv";

dotenv.config();

// required env variables
const required = ["PORT", "NODE_ENV"];
required.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`⚠️ Missing env var: ${key}`);
  }
});

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5001", 10),

  // Vector DB
  chroma: {
    url: process.env.CHROMA_URL || "",
    apiKey: process.env.CHROMA_API_KEY || "",
  },

  // LLM Providers
  llm: {
    openaiKey: process.env.OPENAI_API_KEY || "",
    ollamaUrl: process.env.OLLAMA_API_URL || "http://localhost:11434",
    ollamaModel: process.env.OLLAMA_MODEL || "llama3",
    embedModel: process.env.EMBED_MODEL || "",
  },
};
