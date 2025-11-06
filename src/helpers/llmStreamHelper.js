import { Ollama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

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
