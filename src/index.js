import Fastify from "fastify";
import dotenv from "dotenv";
import aiCommentsRoutes from "./routes/ai-comments.js";

dotenv.config();

const app = Fastify({
  logger: true, // logs all requests
});

// register routes
app.register(aiCommentsRoutes, { prefix: "/ai-comments" });

// start the server
const start = async () => {
  try {
    const port = process.env.PORT || 5001;
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`🚀 Fastify server running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// logging
// app.log.info("this nice");

start();
