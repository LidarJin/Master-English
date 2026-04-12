import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const FLASH_MODEL = "gemini-3-flash-preview";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { english, meaning, isMaintenance } = req.body || {};
  if (!english || typeof english !== "string" || !meaning || typeof meaning !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'english' or 'meaning' field" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  const context = isMaintenance
    ? "Variety Mode: Create a challenging, non-obvious corporate scenario."
    : "Core Mode: Focus on standard professional usage in a leadership context.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: `${context}
      English expression: "${english}" (meaning: ${meaning}).
      Task: Provide a scenario and a simple alternative sentence for rewriting.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenario: { type: Type.STRING },
            simpleSentence: { type: Type.STRING },
          },
          required: ["scenario", "simpleSentence"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    return res.status(200).json(data);
  } catch (e: any) {
    console.error("generate-production-prompt error:", e);
    return res.status(500).json({ error: e.message || "AI generation failed" });
  }
}
