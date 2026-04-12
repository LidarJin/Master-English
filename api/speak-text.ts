import { GoogleGenAI, Modality } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const TTS_MODEL = "gemini-2.5-flash-preview-tts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'text' field" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [
        {
          parts: [
            { text: `Say with British accent, natural professional prosody: ${text}` },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const audioData =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;

    if (!audioData) {
      return res.status(500).json({ error: "No audio data returned" });
    }

    return res.status(200).json({ audio: audioData });
  } catch (e: any) {
    console.error("speak-text error:", e);
    return res.status(500).json({ error: e.message || "TTS generation failed" });
  }
}
