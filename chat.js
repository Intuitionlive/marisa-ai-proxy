// OpenAI Responses API proxy for Marisa AI
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, history } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured." });
    }

    // Build input array from history + current message
    const inputMessages = [];
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-6)) {
        if (msg.role === "user" || msg.role === "assistant") {
          inputMessages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    // Support both {messages} and {history} formats
    if (messages && Array.isArray(messages)) {
      for (const msg of messages) {
        if (msg.role === "user" || msg.role === "assistant") {
          inputMessages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Build the Responses API payload
    const payload = {
      model: "gpt-4o",
      input: inputMessages,
      temperature: 0.65,
      top_p: 0.9,
    };

    // Attach vector store for file search if configured
    // Responses API uses vector_store_ids inside the tool definition
    if (vectorStoreId) {
      payload.tools = [{ type: "file_search", vector_store_ids: [vectorStoreId] }];
    }

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    const data = await r.json();

    // Extract text reply from the Responses API output array
    let reply = "";
    if (data.output && data.output.length > 0) {
      for (const item of data.output) {
        if (item.type === "message" && item.content) {
          const textContent = item.content.find(
            (c) => c.type === "output_text" || c.type === "text"
          );
          if (textContent?.text) {
            reply = textContent.text;
            break;
          }
        }
      }
    }

    res.status(200).json({ reply, raw: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
