// Vercel uses "api" folder as serverless functions
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, system, model = "gpt-4o-mini" } = req.body;

    const payload = {
      model,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        ...messages
      ],
      temperature: 0.7
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    const data = await r.json();
    res.status(200).json({
      reply: data?.choices?.[0]?.message?.content ?? "",
      raw: data
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
