export default async function aiCommentsRoutes(fastify, options) {
  fastify.get("/", async (request, reply) => {
    return { message: "AI Comments route is working ✅" };
  });

  fastify.post("/", async (request, reply) => {
    const { comment } = request.body;

    // In future: analyze sentiment, auto-reply, etc.
    return {
      status: "ok",
      received: comment,
      ai_reply: `AI would respond to: "${comment}"`,
    };
  });
}
