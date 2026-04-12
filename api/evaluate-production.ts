import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const PRO_MODEL = "gemini-3-pro-preview";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { targetChunk, targetMeaning, userInput } = req.body || {};
  if (
    !targetChunk || typeof targetChunk !== "string" ||
    !targetMeaning || typeof targetMeaning !== "string" ||
    !userInput || typeof userInput !== "string"
  ) {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: `Evaluate:
      Target Chunk: "${targetChunk}"
      Intended Meaning: "${targetMeaning}"
      User's Sentence: "${userInput}"
      Return isCorrect, feedback, and improvedVersion.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING },
            improvedVersion: { type: Type.STRING },
          },
          required: ["isCorrect", "feedback", "improvedVersion"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    return res.status(200).json(data);
  } catch (e: any) {
    console.error("evaluate-production error:", e);
    return res.status(500).json({ error: e.message || "AI evaluation failed" });
  }
}
