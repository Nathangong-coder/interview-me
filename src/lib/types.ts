export type Verdict = "correct" | "partial" | "incorrect" | "gave_up";

export type Attempt = {
  at: number;
  verdict: Verdict;
  score?: number;
};

export type Question = {
  id: string;
  title: string;
  question: string;
  solution: string;
  tags: string[];
  createdAt: number;
  attempts: Attempt[];
};

export type Vendor =
  | "zhipu"
  | "deepseek"
  | "openai"
  | "anthropic"
  | "gemini"
  | "elevenlabs"
  | "custom";

export type TTSProvider = "browser" | "zhipu" | "openai" | "gemini" | "elevenlabs";
export type LLMProvider = "zhipu" | "deepseek" | "openai" | "anthropic" | "gemini" | "custom";

export type TTSConfig = { model: string; voice: string };
export type LLMConfig = { model: string; baseUrl: string };

export type Settings = {
  keys: Record<Vendor, string>;
  tts: {
    provider: TTSProvider;
    rate: number;
    browserVoice: string;
    configs: Record<Exclude<TTSProvider, "browser">, TTSConfig>;
  };
  llm: {
    provider: LLMProvider;
    configs: Record<LLMProvider, LLMConfig>;
  };
  allowReplay: boolean;
  speakReplies: boolean;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type GradeResult = {
  verdict: Exclude<Verdict, "gave_up">;
  score: number;
  summary: string;
  correct: string[];
  missing: string[];
  mistakes: string[];
};
