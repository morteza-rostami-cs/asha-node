import dotenv from "dotenv";

dotenv.config();

// required env variables
const required = ["PORT", "NODE_ENV"];
required.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`⚠️ Missing env var: ${key}`);
  }
});

// is it production
const ENV = process.env.NODE_ENV || "development";
const isProd = ENV === "production";

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5001", 10),

  // Vector DB
  chroma: {
    url: process.env.CHROMA_URL || "",
    apiKey: process.env.CHROMA_API_KEY || "",
    storagePath: process.env.CHROMA_STORAGE_PATH || "./chroma_db",
  },

  // LLM Providers
  llm: {
    provider: "ollama",
    apiUrl: isProd
      ? process.env.OLLAMA_API_URL_PROD
      : process.env.OLLAMA_API_URL_DEV,
    model: process.env.OLLAMA_MODEL || "gemma2:2b",
    embedModel: process.env.EMBED_MODEL || "mxbai-embed-large",
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  wp: {
    apiUrl: isProd ? process.env.WP_API_URL_PROD : process.env.WP_API_URL_DEV,
  },
};

console.log(
  `🧠 Loaded config for ${ENV} environment (LLM URL → ${config.llm.apiUrl})`
);
