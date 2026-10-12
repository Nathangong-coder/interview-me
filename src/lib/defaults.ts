import { LLM_MODELS, TTS_MODELS } from "./catalog";
import type { LLMProvider, Question, Settings, TTSProvider, Vendor } from "./types";

export const VENDOR_LABELS: Record<Vendor, string> = {
  zhipu: "Zhipu GLM",
  deepseek: "DeepSeek",
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  gemini: "Google Gemini",
  elevenlabs: "ElevenLabs",
  custom: "Custom (OpenAI-compatible)",
};

export const KEY_LINKS: Partial<Record<Vendor, string>> = {
  zhipu: "https://open.bigmodel.cn/usercenter/apikeys",
  deepseek: "https://platform.deepseek.com/api_keys",
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  gemini: "https://aistudio.google.com/apikey",
  elevenlabs: "https://elevenlabs.io/app/settings/api-keys",
};

export const TTS_LABELS: Record<TTSProvider, string> = {
  browser: "Browser voice (free, no key)",
  zhipu: "Zhipu GLM-TTS",
  openai: "OpenAI TTS",
  gemini: "Gemini TTS",
  elevenlabs: "ElevenLabs",
};

/** Max characters sent per TTS request; long questions are split into chunks. */
export const TTS_CHUNK: Record<TTSProvider, number> = {
  browser: 220,
  zhipu: 900,
  openai: 3500,
  gemini: 3000,
  elevenlabs: 2500,
};

export const LLM_LABELS: Record<LLMProvider, string> = {
  zhipu: "Zhipu GLM",
  deepseek: "DeepSeek",
  openai: "OpenAI",
  anthropic: "Claude",
  gemini: "Gemini",
  custom: "Custom (OpenAI-compatible)",
};

/** Bump when default model names change so saved settings get migrated. */
export const SETTINGS_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  keys: {
    zhipu: "",
    deepseek: "",
    openai: "",
    anthropic: "",
    gemini: "",
    elevenlabs: "",
    custom: "",
  },
  tts: {
    provider: "browser",
    rate: 1,
    browserVoice: "",
    configs: {
      zhipu: { model: TTS_MODELS.zhipu[0].id, voice: "tongtong" },
      openai: { model: TTS_MODELS.openai[0].id, voice: "alloy" },
      gemini: { model: TTS_MODELS.gemini[0].id, voice: "Kore" },
      elevenlabs: { model: TTS_MODELS.elevenlabs[0].id, voice: "21m00Tcm4TlvDq8ikWAM" },
    },
  },
  llm: {
    provider: "zhipu",
    configs: {
      zhipu: { model: LLM_MODELS.zhipu[0].id, baseUrl: "https://open.bigmodel.cn/api/paas/v4" },
      deepseek: { model: LLM_MODELS.deepseek[0].id, baseUrl: "https://api.deepseek.com" },
      openai: { model: LLM_MODELS.openai[0].id, baseUrl: "https://api.openai.com/v1" },
      anthropic: { model: LLM_MODELS.anthropic[0].id, baseUrl: "https://api.anthropic.com/v1" },
      gemini: {
        model: LLM_MODELS.gemini[0].id,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      },
      custom: { model: "", baseUrl: "" },
    },
  },
  allowReplay: false,
  speakReplies: false,
};

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: "sample-1",
    title: "Warehouse robot routing",
    question:
      "A warehouse is laid out as a grid with R rows and C columns, where R and C are each at most 1000. Some cells contain shelves and cannot be entered. A single robot starts at the top-left cell and must deliver a package to the bottom-right cell. The robot moves up, down, left, or right one cell at a time, and each move takes 1 second. However, the robot is allowed to smash through at most K shelves in total during its trip, where K is at most 10, and smashing a shelf costs an extra 3 seconds on top of the move into that cell. Return the minimum number of seconds needed to reach the bottom-right cell, or minus 1 if it is impossible.",
    solution:
      "Model states as (row, col, shelvesSmashed). Run Dijkstra (or 0-1/bucketed BFS since weights are 1 and 4) over R*C*(K+1) states. Moving into a free cell costs 1 with same k; moving into a shelf costs 4 and increments k (only if k < K). Answer is min over k of dist(R-1, C-1, k), or -1. Complexity O(R*C*K*log(R*C*K)) with Dijkstra, ~1.1e7 states worst case.",
    tags: ["graphs", "dijkstra"],
    createdAt: Date.now(),
    attempts: [],
  },
];
