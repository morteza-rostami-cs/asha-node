// this does not support -> agent tooling
// import { Ollama } from "@langchain/ollama";

// this supports -> agent tooling
import { ChatOllama } from "@langchain/ollama";

import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import {
  StringOutputParser,
  StructuredOutputParser,
} from "@langchain/core/output_parsers";

// structured output
import { z } from "zod";
import { createAgent, toolStrategy } from "langchain";

/**
 * Generic streaming function for any prompt and input data.
 * @param {Object} options
 * @param {string} options.promptTemplate - The prompt string with placeholders like {topic} or {comment}.
 * @param {Object} options.inputData - Variables to fill into the prompt template.
 * @param {Function} [options.onChunk] - Optional callback that receives streamed text chunks.
 * @param {Object} [options.modelOptions] - LLM options (model, temperature, etc.).
 * @returns {Promise<void>}
 */
export async function streamLLMResponse({
  promptTemplate,
  inputData,
  onChunk,
  modelOptions = {},
}) {
  // llm model
  const llm = new Ollama({
    model: modelOptions.model || "gemma2:2b",
    temperature: modelOptions.temperature ?? 0.7,
    maxRetries: modelOptions.maxRetries ?? 2,
    baseUrl: modelOptions.baseUrl || "http://localhost:11434",
  });

  const prompt = PromptTemplate.fromTemplate(promptTemplate);
  const outputParser = new StringOutputParser();

  const chain = RunnableSequence.from([prompt, llm, outputParser]);

  const stream = await chain.stream(inputData);

  for await (const chunk of stream) {
    if (onChunk) onChunk(chunk);
    else process.stdout.write(chunk);
  }

  console.log("\n--- Stream End ---\n");
}

/**
 * Reusable structured LLM helper
 * @param {Object} options
 * @param {string} options.promptTemplate - A prompt template string with placeholders like {comment}, {thread}, etc.
 * @param {Object} options.inputData - The data object containing keys for the template placeholders.
 * @param {z.ZodSchema} options.schema - A Zod schema defining the structured output.
 * @param {Object} [options.modelOptions] - LLM settings (model name, temperature, retries, baseUrl).
 * @returns {Promise<Object>} Parsed and validated structured output from the model.
 */
export async function llmStructuredTask({
  promptTemplate,
  inputData,
  schema,
  modelOptions = {},
}) {
  // 1️⃣ Preprocess input data (flatten arrays of objects)
  const formattedInput = Object.fromEntries(
    Object.entries(inputData).map(([key, value]) => {
      if (Array.isArray(value) && value.every((v) => typeof v === "object")) {
        return [
          key,
          value
            .map(
              (v, i) =>
                `${i + 1}. ${v.author ?? "User"}: ${
                  v.text ?? JSON.stringify(v)
                }`
            )
            .join("\n"),
        ];
      }
      if (typeof value === "object" && value !== null)
        return [key, JSON.stringify(value, null, 2)];
      return [key, value];
    })
  );

  // 2️⃣ Build LLM, parser, and prompt
  const llm = new ChatOllama({
    model: modelOptions.model || "gemma2:2b",
    temperature: modelOptions.temperature ?? 0.7,
    maxRetries: modelOptions.maxRetries ?? 2,
    baseUrl: modelOptions.baseUrl || "http://localhost:11434",
  });

  const parser = StructuredOutputParser.fromZodSchema(schema);
  const formatInstructions = parser.getFormatInstructions();

  const prompt = PromptTemplate.fromTemplate(
    `${promptTemplate}
    \n\nRespond ONLY with a valid JSON object matching the format:\n
    {format_instructions}
    \n
    If previous attempt failed, you may also receive an "error" message explaining what went wrong.
    Use that info to fix the formatting or fill missing fields.

    {error}
    `
  );

  const chain = RunnableSequence.from([prompt, llm]);
  const maxRetries = modelOptions.maxRetries ?? 3;

  // 3️⃣ Retry loop
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const raw = await chain.invoke({
        ...formattedInput,
        format_instructions: formatInstructions,
        error:
          attempt === 1
            ? ""
            : `Previous attempt failed: ${lastError?.message ?? ""}`,
      });

      // remove string wrapper
      let rawText = raw.content;
      rawText = rawText.replace(/```json|```/g, "").trim();

      // parse and validate
      const parsed = await parser.parse(rawText);

      // ✅ Final sanity check (avoid empty replies)
      // if (!parsed.reply || parsed.reply.trim() === "") {
      //   throw new Error("Reply is empty, please generate a meaningful one.");
      // }

      return parsed;
    } catch (err) {
      // set the error and keep trying
      lastError = err;
      console.warn(`⚠️ Attempt ${attempt} failed: ${err.message}`);
    }
  }

  throw new Error(
    `Failed after ${maxRetries} retries. Last error: ${lastError}`
  );
}

// https://docs.langchain.com/oss/javascript/langchain/structured-output
// just return the response -> no stream
export async function sdadsassdasd({
  // promptTemplate,
  input,
  modelOptions = {},
}) {
  const llm = new ChatOllama({
    model: modelOptions.model || "gemma2:2b",
    temperature: modelOptions.temperature ?? 0.7,
    maxRetries: modelOptions.maxRetries ?? 2,
    baseUrl: modelOptions.baseUrl || "http://localhost:11434",
  });

  // agent
  const agent = createAgent({
    model: llm,
    responseFormat: toolStrategy(CommentAnalysisSchema, {
      handleError:
        "Please return valid JSON with keys sentiment, title, and reply.",
    }),
  });

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: `
        You are an AI that analyzes user comments in a discussion thread.
        Given the current comment and its thread, return sentiment, title, and reply.

        Thread:
        ${input.thread}

        Current Comment:
        ${input.comment}
        `,
      },
    ],
  });

  return result.structuredResponse;
}
