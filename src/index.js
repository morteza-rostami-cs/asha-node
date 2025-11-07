import Fastify from "fastify";
import aiCommentsRoutes from "./routes/ai-comments.js";
// config file
import { config } from "./config/config.js";
// import global value
import { clients } from "./helpers/clients.js";
import cors from "@fastify/cors"; // ✅ import plugin

const app = Fastify({
  // logger: true, // logs all requests
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
        colorize: true,
      },
    },
  },
});

const api_v1 = "/api/v1";
const port = config.port;

// ✅ Register CORS plugin BEFORE routes
await app.register(cors, {
  origin: ["http://localhost:5173"], // your React app
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

// register routes
await app.register(aiCommentsRoutes, { prefix: api_v1 + "/ai-comments" });

// map of connected clients, identify with their commentId
// so, basically each client gets it's own stream based on commentId
// const clients = new Map();

// sse connection route
// /sse?commentId=abc123
app.get("/sse", async (request, reply) => {
  const userId = request.query?.userId;

  // only connects if there is a userId
  if (!userId) return reply.code(400).send("missing userId");

  // set special headers required for SSE
  // raw.reply -> is underlying nodeJs http response
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Credentials": "true",
  });

  // a function that server can call for each client -> and send message to client
  const send = (data) => reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  // const send = clients.get('client1')
  // send({aiResponse: ""})

  clients.set(userId, send);

  console.log(`🧠 New SSE connection → ${userId}`);

  // ✅ Send welcome message immediately
  send({
    type: "welcome",
    message: `👋 Welcome client ${userId}! You're now connected to the SSE stream.`,
    time: new Date().toISOString(),
  });

  // when client closes connection -> remove from clients
  request.raw.on("close", () => {
    console.log(`❌ Disconnected: ${userId}`);
    clients.delete(userId);
  });
});

// start the server
const start = async () => {
  try {
    // const port = process.env.PORT || 5001;
    // ✅ wait until all plugins are ready
    await app.ready();
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
