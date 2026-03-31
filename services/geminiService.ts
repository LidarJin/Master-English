
import { GoogleGenAI, Type, Modality } from "@google/genai";

const FLASH_MODEL = "gemini-3-flash-preview";
const PRO_MODEL = "gemini-3-pro-preview";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateChunkDetails(english: string) {
  if (!process.env.API_KEY) return null;
  const ai = getAi();
  try {
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
            register: { type: Type.STRING }
          },
          required: ["englishMeaning", "pronunciation", "examples", "register"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return null;
  }
}

export async function generateProductionPrompt(english: string, meaning: string, isMaintenance: boolean = false) {
  if (!process.env.API_KEY) return null;
  const ai = getAi();
  const context = isMaintenance 
    ? "Variety Mode: Create a challenging, non-obvious corporate scenario." 
    : "Core Mode: Focus on standard professional usage in a leadership context.";
  try {
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
            simpleSentence: { type: Type.STRING }
          },
          required: ["scenario", "simpleSentence"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return null;
  }
}

export async function evaluateProduction(targetChunk: string, targetMeaning: string, userInput: string) {
  if (!process.env.API_KEY) return null;
  const ai = getAi();
  try {
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
            improvedVersion: { type: Type.STRING }
          },
          required: ["isCorrect", "feedback", "improvedVersion"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return null;
  }
}

export async function speakText(text: string): Promise<string | null> {
  if (!process.env.API_KEY) return null;
  const ai = getAi();
  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: `Say with British accent, natural professional prosody: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is a high-quality voice
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (e) {
    return null;
  }
}
