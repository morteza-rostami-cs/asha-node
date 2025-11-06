import Fastify from "fastify";
import aiCommentsRoutes from "./routes/ai-comments.js";
// config file
import { config } from "./config/config.js";

const app = Fastify({
  logger: true, // logs all requests
});

const api_v1 = "/api/v1";
const port = config.port;

// register routes
app.register(aiCommentsRoutes, { prefix: api_v1 + "/ai-comments" });

// start the server
const start = async () => {
  try {
    // const port = process.env.PORT || 5001;
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`🚀 Fastify server running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// ✅ Graceful shutdown handler
const shutdown = async (signal) => {
  try {
    app.log.info(`Received ${signal}. Closing server...`);
    await app.close();
    app.log.info("🧹 Server closed cleanly. Bye!");
    process.exit(0);
  } catch (err) {
    app.log.error("Error during shutdown:", err);
    process.exit(1);
  }
};

// Listen for termination signals
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
