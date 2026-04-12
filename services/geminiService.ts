export async function generateChunkDetails(english: string) {
  try {
    const res = await fetch("/api/generate-chunk-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ english }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function generateProductionPrompt(english: string, meaning: string, isMaintenance: boolean = false) {
  try {
    const res = await fetch("/api/generate-production-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ english, meaning, isMaintenance }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function evaluateProduction(targetChunk: string, targetMeaning: string, userInput: string) {
  try {
    const res = await fetch("/api/evaluate-production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetChunk, targetMeaning, userInput }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function speakText(text: string): Promise<string | null> {
  try {
    const res = await fetch("/api/speak-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.audio || null;
  } catch (e) {
    return null;
  }
}
