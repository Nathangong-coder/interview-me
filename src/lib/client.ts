"use client";

import { TTS_CHUNK } from "./defaults";
import type { ChatMessage, Settings } from "./types";

/** Split text into sentence-aligned chunks of at most `max` characters. */
export function chunkText(text: string, max: number): string[] {
  const sentences = text.replace(/\s+/g, " ").trim().match(/[^.!?。！？]+[.!?。！？]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      chunks.push(cur.trim());
      cur = "";
    }
    if (s.length > max) {
      for (let i = 0; i < s.length; i += max) chunks.push(s.slice(i, i + max).trim());
    } else {
      cur += s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter(Boolean);
}

export type Narration = { stop: () => void; done: Promise<void> };

/** Speak text with the configured provider. Resolves `done` when finished (or stopped). */
export function narrate(text: string, settings: Settings): Narration {
  const provider = settings.tts.provider;
  const chunks = chunkText(text, TTS_CHUNK[provider]);
  let stopped = false;

  if (provider === "browser") {
    const synth = window.speechSynthesis;
    const voice = synth.getVoices().find((v) => v.name === settings.tts.browserVoice);
    const done = new Promise<void>((resolve, reject) => {
      if (!synth) return reject(new Error("This browser has no speech synthesis."));
      synth.cancel();
      let i = 0;
      const next = () => {
        if (stopped || i >= chunks.length) return resolve();
        const u = new SpeechSynthesisUtterance(chunks[i++]);
        if (voice) u.voice = voice;
        u.rate = settings.tts.rate;
        u.onend = next;
        u.onerror = (e) => (e.error === "interrupted" || e.error === "canceled" ? resolve() : reject(new Error(`Speech error: ${e.error}`)));
        synth.speak(u);
      };
      next();
    });
    return {
      stop: () => {
        stopped = true;
        synth?.cancel();
      },
      done,
    };
  }

  const cfg = settings.tts.configs[provider];
  const apiKey = settings.keys[provider];
  let audio: HTMLAudioElement | null = null;
  const urls: string[] = [];

  const fetchChunk = async (chunk: string) => {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        apiKey,
        model: cfg.model,
        voice: cfg.voice,
        text: chunk,
        speed: settings.tts.rate,
        baseUrl: provider === "zhipu" ? settings.llm.configs.zhipu.baseUrl : undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `TTS failed (${res.status})`);
    }
    const url = URL.createObjectURL(await res.blob());
    urls.push(url);
    return url;
  };

  const play = (url: string) =>
    new Promise<void>((resolve, reject) => {
      audio = new Audio(url);
      audio.onended = () => resolve();
      audio.onpause = () => stopped && resolve();
      audio.onerror = () => reject(new Error("Could not play the audio returned by the provider."));
      audio.play().catch(reject);
    });

  const done = (async () => {
    if (!apiKey) throw new Error(`No API key for ${provider} — add one in Settings.`);
    try {
      let pending = fetchChunk(chunks[0]);
      for (let i = 0; i < chunks.length && !stopped; i++) {
        const url = await pending;
        // Prefetch the next chunk while this one plays.
        if (i + 1 < chunks.length) {
          pending = fetchChunk(chunks[i + 1]);
          pending.catch(() => {}); // surfaced when awaited; avoid unhandled rejection if stopped early
        }
        if (stopped) break;
        await play(url);
      }
    } finally {
      urls.forEach((u) => URL.revokeObjectURL(u));
    }
  })();

  return {
    stop: () => {
      stopped = true;
      (audio as HTMLAudioElement | null)?.pause();
    },
    done,
  };
}

export async function askLLM(settings: Settings, system: string, messages: ChatMessage[]) {
  const provider = settings.llm.provider;
  const cfg = settings.llm.configs[provider];
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      apiKey: settings.keys[provider],
      model: cfg.model,
      baseUrl: cfg.baseUrl,
      system,
      messages,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data.text as string;
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

export function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}
