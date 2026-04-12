import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const PRO_MODEL = "gemini-3-pro-preview";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { english } = req.body || {};
  if (!english || typeof english !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'english' field" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: `Analyze the English expression: "${english}".
      JSON Output Rules:
      1. englishMeaning: Plain English logic (max 10 words).
      2. pronunciation: Provide the British English Received Pronunciation (RP) IPA symbols, enclosed in brackets.
      3. examples: Two high-level corporate/leadership example sentences.
      4. register: One word: 'Formal', 'Casual', or 'Neutral'.
      CRITICAL: For the pronunciation, ensure it's accurate British phonetics.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            englishMeaning: { type: Type.STRING },
            pronunciation: { type: Type.STRING },
            examples: { type: Type.ARRAY, items: { type: Type.STRING } },
            register: { type: Type.STRING },
          },
          required: ["englishMeaning", "pronunciation", "examples", "register"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    return res.status(200).json(data);
  } catch (e: any) {
    console.error("generate-chunk-details error:", e);
    return res.status(500).json({ error: e.message || "AI generation failed" });
  }
}
