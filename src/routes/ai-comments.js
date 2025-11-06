import {
  streamLLMResponse,
  llmStructuredTask,
} from "../helpers/llmStreamHelper.js";

import safeJSONParse from "../helpers/safeJSONParse.js";
import { z } from "zod";

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

    // POST /ai-comments/comment-analysis
    /*
    # input
    {
      "comment": "I think your plugin is too slow sometimes.",
      "thread": [
        { "author": "Admin", "text": "Thanks for your feedback!" },
        { "author": "UserA", "text": "It works fine for me." }
      ]
    }
    */

    return { message: "AI Comments route is working ✅" };
  });

  fastify.post("/comment-analysis", async (request, reply) => {
    try {
      // data
      console.log("=====================================");
      fastify.log.info("$$$$$$$$$$$$$$$$$$$$$==============");

      // const { comment, thread } = request.body;

      const comment = request.body?.comment;
      const thread = request.body?.thread;

      //return reply.code(200).send({ comment, thread });
      // request.log.warn("👈");
      if (!comment) {
        return reply.status(400).json({ error: "comment is required." });
      }

      const schema = z.object({
        sentiment: z.enum(["positive", "neutral", "negative"]),
        title: z.string(),
        reply: z.string(),
      });

      const promptTemplate = `
      You are an AI that analyzes user comments in a discussion thread.  
      Given the current comment and its thread, return sentiment, title, and reply.

      Thread:
      {thread}

      Current Comment:
      {comment}

      Please provide the output **only as a JSON object** with the following fields:
      - "sentiment": a value of "positive", "neutral", or "negative"
      - "title": a short string summarizing the comment
      - "reply": a friendly AI-generated reply that fits the thread tone.

      Your output should match the schema below (but **DO NOT include the schema in the output**):

      {{
        "sentiment": "positive",
        "title": "Great feedback!",
        "reply": "Thank you for your feedback!"
      }}
      `;

      const aiResponse = await llmStructuredTask({
        promptTemplate,
        inputData: { comment, thread },
        schema,
        modelOptions: {
          model: "gemma2:2b",
          baseUrl: "http://localhost:11434",
          temperature: 0.8,
          maxRetries: 3,
        },
      });

      // res.json({ success: true, ai: aiResponse });
      reply.code(200).send({ success: true, ai: aiResponse });
    } catch (err) {
      console.error(`‼️ai analysis error: ‼️`, err);
      reply.code(500).send({ error: "ai analysis failed" });
    }
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
