import {
  streamLLMResponse,
  llmStructuredTask,
} from "../helpers/llmStreamHelper.js";

import safeJSONParse from "../helpers/safeJSONParse.js";
import { z } from "zod";
import { sendToClient } from "../helpers/clients.js";
import { config } from "../config/config.js";

export default async function aiCommentsRoutes(fastify, options) {
  fastify.get("/", async (request, reply) => {
    // send sse message
    sendToClient("13", { status: "done" });

    return { message: "AI Comments route is working ✅" };
  });

  fastify.post("/reply", async (request, reply) => {
    try {
      // data

      const comment = request.body?.comment;
      const thread = request.body?.thread;

      //return reply.code(200).send({ comment, thread });
      // request.log.warn("👈");
      if (!comment) {
        return reply.status(400).json({ error: "comment is required." });
      }

      const schema = z.object({
        reply: z.string(),
        tone: z.enum(["helpful", "funny", "professional"]).optional(),
        reasoning: z.string().optional(), // optional insight for debugging or moderation
      });

      const promptTemplate = `
      You are an AI assistant that helps reply to comments in an online discussion.

      Your task:
      - Read the entire discussion thread for context.
      - Understand the tone of the thread (friendly, frustrated, joking, etc.).
      - Then craft a thoughtful, natural reply to the **latest comment**, as if continuing the conversation.

      Rules:
      1. The reply must be in a human, conversational style — no robotic tone.
      2. If the comment is rude or negative, respond politely and try to de-escalate.
      3. Keep your reply under 80 words.
      4. Do NOT include any markdown, emojis, or formatting — plain text only.
      5. Return ONLY a JSON object matching the schema below.

      Example JSON:
      {{
        "reply": "Thanks for your feedback! I'll look into improving the plugin performance.",
        "tone": "helpful"
      }}

      Thread so far:
      {thread}

      User's latest comment:
      "{comment}"
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
      console.error(`‼️ai reply generation error: ‼️`, err);
      reply.code(500).send({ error: "ai reply generation failed" });
    }
  });

  // { "approved": true, "reason": "Polite and constructive feedback." }

  // POST /ai-comments/moderate
  fastify.post("/moderate", async (request, reply) => {
    try {
      // data
      const comment = request.body?.comment;
      const commentId = request.body?.commentId;

      if (!comment && !commentId) {
        return reply.status(400).json({ error: "comment is required." });
      }

      const schema = z.object({
        approved: z.boolean(),
        reason: z.string(),
        sentiment: z.enum(["positive", "negative", "neutral"]),
        title: z.string(),
      });

      // , relevant, or constructive irrelevant/spam,
      const promptTemplate = `
      You are a WordPress AI moderator and analyzer.

      Your tasks:
      1. Decide if the comment should be APPROVED or REJECTED.
      2. Analyze the sentiment of the comment: "positive", "negative", or "neutral".
      3. Generate a short human-readable TITLE (max 6 words) summarizing the comment.

      Rules:
      - Approve if the comment is polite.
      - Reject if it contains hate, insults, or offensive language.
      - Title should sound natural and related to the comment tone.
      - Respond ONLY in the exact JSON format.

      Comment:
      "{comment}"
      `;

      // notify react of analyzing status
      sendToClient(commentId, { status: "analyzing" });

      const aiResponse = await llmStructuredTask({
        promptTemplate,
        inputData: { comment },
        schema,
        modelOptions: {
          model: "gemma2:2b",
          baseUrl: "http://localhost:11434",
          temperature: 0.8,
          maxRetries: 3,
        },
      });

      // call wp to store, title , sentiment, approved
      const wpModerationUrl = config.wp.apiUrl + "/ai-comments/v1/moderation";

      const wpRes = await fetch(wpModerationUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, ...aiResponse }),
      });

      // signal to client -> aiResponse ready -> so: fetch the comments again
      if (wpRes.ok) sendToClient(commentId, { status: "done", commentId });

      if (!wpRes.ok) {
        console.log("####### wp moderate store data failed. #######");
        sendToClient(commentId, { status: "failed", commentId });
      }

      console.log("*************");
      console.log(aiResponse);

      // res.json({ success: true, ai: aiResponse });
      reply.code(200).send({ success: true, ai: aiResponse });
    } catch (err) {
      console.error(`‼️ai comment analysis error: ‼️`, err);
      reply.code(500).send({ error: "ai comment analysis failed" });
    }
  });
}
