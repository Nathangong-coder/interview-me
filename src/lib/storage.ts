"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, SAMPLE_QUESTIONS } from "./defaults";
import type { Question, Settings } from "./types";

const SETTINGS_KEY = "interview-me:settings";
const BANK_KEY = "interview-me:bank";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked — keep working in memory
  }
}

/** Merge saved settings over defaults so newly added fields always exist. */
function mergeSettings(saved: Partial<Settings> | null): Settings {
  if (!saved) return DEFAULT_SETTINGS;
  const d = DEFAULT_SETTINGS;
  return {
    ...d,
    ...saved,
    keys: { ...d.keys, ...saved.keys },
    tts: {
      ...d.tts,
      ...saved.tts,
      configs: { ...d.tts.configs, ...saved.tts?.configs },
    },
    llm: {
      ...d.llm,
      ...saved.llm,
      configs: { ...d.llm.configs, ...saved.llm?.configs },
    },
  };
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setSettingsState(mergeSettings(read<Settings>(SETTINGS_KEY)));
    setLoaded(true);
  }, []);

  const setSettings = useCallback((next: Settings) => {
    setSettingsState(next);
    write(SETTINGS_KEY, next);
  }, []);

  return { settings, setSettings, loaded };
}

export function useBank() {
  const [bank, setBankState] = useState<Question[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setBankState(read<Question[]>(BANK_KEY) ?? SAMPLE_QUESTIONS);
    setLoaded(true);
  }, []);

  const setBank = useCallback((updater: (prev: Question[]) => Question[]) => {
    setBankState((prev) => {
      const next = updater(prev);
      write(BANK_KEY, next);
      return next;
    });
  }, []);

  return { bank, setBank, loaded };
}

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
