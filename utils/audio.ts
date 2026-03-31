
/**
 * Shared utility for handling raw PCM audio from Gemini TTS.
 */

let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    // CRITICAL: Gemini TTS returns 16-bit PCM at 24000Hz. Explicitly setting sampleRate ensures audio plays at correct speed.
    sharedAudioCtx = new AudioContextClass({ sampleRate: 24000 });
  }
  return sharedAudioCtx;
};

/**
 * Decodes a base64 string to a Uint8Array.
 */
const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Decodes raw PCM (16-bit mono) data into an AudioBuffer.
 * Gemini TTS returns 16-bit PCM at 24000Hz by default.
 */
const decodeRawPCM = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert 16-bit signed integer to float range [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

/**
 * Synthesizes and plays audio from a base64 raw PCM string.
 */
export const playPCMBase64 = async (base64: string): Promise<void> => {
  const ctx = getAudioContext();
  
  // Browsers require a user interaction to start the context
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const rawData = decodeBase64(base64);
  const audioBuffer = await decodeRawPCM(rawData, ctx);
  
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  source.start();
  
  return new Promise((resolve) => {
    source.onended = () => resolve();
  });
};
