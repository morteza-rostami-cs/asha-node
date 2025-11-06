export default function safeJSONParse(text) {
  try {
    // Try normal parse first
    return JSON.parse(text);
  } catch {
    // Remove markdown fences or text before/after JSON
    const match = text.match(/{[\s\S]*}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
  }
  // fallback default
  return {
    sentiment: "neutral",
    title: "Untitled",
    reply: "Thanks for your comment!",
  };
}
