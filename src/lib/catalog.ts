import type { LLMProvider, TTSProvider } from "./types";

export type Option = { id: string; label: string };

/** Curated chat models per provider (checked against provider docs, Oct 2026). First entry is the default. */
export const LLM_MODELS: Record<LLMProvider, Option[]> = {
  zhipu: [
    { id: "glm-4.7-flash", label: "GLM-4.7 Flash (free)" },
    { id: "glm-4.5-flash", label: "GLM-4.5 Flash (free)" },
    { id: "glm-4-flash-250414", label: "GLM-4 Flash (free)" },
    { id: "glm-5.3-flash", label: "GLM-5.3 Flash" },
    { id: "glm-5.3", label: "GLM-5.3" },
    { id: "glm-5.2", label: "GLM-5.2" },
    { id: "glm-4.7", label: "GLM-4.7" },
    { id: "glm-4.6", label: "GLM-4.6" },
    { id: "glm-4.5-air", label: "GLM-4.5 Air" },
  ],
  deepseek: [
    { id: "deepseek-flash", label: "DeepSeek V4.1 Flash" },
    { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
  ],
  openai: [
    { id: "gpt-6-luna", label: "GPT-6 Luna (fast, cheap)" },
    { id: "gpt-6.1-sol", label: "GPT-6.1 Sol" },
    { id: "gpt-6-astra", label: "GPT-6 Astra (most capable)" },
  ],
  anthropic: [
    { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
    { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (fastest)" },
    { id: "claude-opus-5-5", label: "Claude Opus 5.5" },
    { id: "claude-fable-5-1", label: "Claude Fable 5.1 (most capable)" },
  ],
  gemini: [
    { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (fast, cheap)" },
    { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
    { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  ],
  custom: [],
};

export const TTS_MODELS: Record<Exclude<TTSProvider, "browser">, Option[]> = {
  zhipu: [{ id: "glm-tts", label: "GLM-TTS" }],
  openai: [{ id: "gpt-4o-mini-tts", label: "GPT-4o mini TTS" }],
  gemini: [
    { id: "gemini-3.8-flash-lite-tts", label: "Gemini 3.8 Flash-Lite TTS (fast)" },
    { id: "gemini-3.8-flash-tts", label: "Gemini 3.8 Flash TTS (best quality)" },
  ],
  elevenlabs: [
    { id: "eleven_flash_v2_5", label: "Flash v2.5 (fast, multilingual)" },
    { id: "eleven_multilingual_v2", label: "Multilingual v2" },
    { id: "eleven_v4_turbo", label: "v4 Turbo" },
    { id: "eleven_v4", label: "v4 (most expressive)" },
  ],
};

export const TTS_VOICES: Record<Exclude<TTSProvider, "browser">, Option[]> = {
  zhipu: [
    { id: "tongtong", label: "彤彤 Tongtong (default)" },
    { id: "xiaochen", label: "小陈 Xiaochen" },
    { id: "chuichui", label: "锤锤 Chuichui" },
    { id: "jam", label: "Jam" },
    { id: "kazi", label: "Kazi" },
    { id: "douji", label: "Douji" },
    { id: "luodo", label: "Luodo" },
  ],
  openai: ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse"].map(
    (v) => ({ id: v, label: v[0].toUpperCase() + v.slice(1) }),
  ),
  gemini: [
    ["Kore", "firm"],
    ["Puck", "upbeat"],
    ["Charon", "informative"],
    ["Fenrir", "excitable"],
    ["Aoede", "breezy"],
    ["Leda", "youthful"],
    ["Orus", "firm"],
    ["Zephyr", "bright"],
  ].map(([id, d]) => ({ id, label: `${id} (${d})` })),
  elevenlabs: [
    { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel" },
    { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah" },
    { id: "pNInz6obpgDQGcFmaJgB", label: "Adam" },
    { id: "ErXwobaYiN019PkySvjV", label: "Antoni" },
  ],
};

export const ZHIPU_REGIONS: Option[] = [
  { id: "https://open.bigmodel.cn/api/paas/v4", label: "China — open.bigmodel.cn" },
  { id: "https://api.z.ai/api/paas/v4", label: "International — api.z.ai" },
];
