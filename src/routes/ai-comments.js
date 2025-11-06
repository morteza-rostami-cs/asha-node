import { streamLLMResponse } from "../helpers/llmStreamHelper.js";

export default async function aiCommentsRoutes(fastify, options) {
  fastify.get("/", async (request, reply) => {
    const prompt = `
    You are an AI comment assistant.  
    Analyze this comment and respond in a friendly way.

    Comment: {comment}
    Tone: {tone}
    `;

    await streamLLMResponse({
      promptTemplate: prompt,
      inputData: {
        comment: "This plugin looks awesome!",
        tone: "funny",
      },
      onChunk: (chunk) => process.stdout.write(chunk),
      modelOptions: {
        model: "gemma2:2b",
        temperature: 0.8,
      },
    });

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
