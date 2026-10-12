"use client";

import { useEffect, useState } from "react";
import { askLLM, narrate } from "@/lib/client";
import {
  KEY_LINKS,
  LLM_LABELS,
  TTS_LABELS,
  TTS_VOICE_HINTS,
  VENDOR_LABELS,
} from "@/lib/defaults";
import type { LLMProvider, Settings, TTSProvider, Vendor } from "@/lib/types";

export function SettingsPanel({
  settings: s,
  setSettings,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsStatus, setTtsStatus] = useState("");
  const [llmStatus, setLlmStatus] = useState("");

  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const load = () => setVoices(speechSynthesis.getVoices());
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const setKey = (v: Vendor, key: string) => setSettings({ ...s, keys: { ...s.keys, [v]: key.trim() } });
  const tts = s.tts;
  const llm = s.llm;
  const ttsCfg = tts.provider !== "browser" ? tts.configs[tts.provider] : null;
  const llmCfg = llm.configs[llm.provider];

  const testVoice = async () => {
    setTtsStatus("Playing…");
    try {
      await narrate("Hi! I'll be your interviewer today. Here is your first question.", s).done;
      setTtsStatus("✓ Works");
    } catch (e) {
      setTtsStatus(`✕ ${e instanceof Error ? e.message : e}`);
    }
  };

  const testLLM = async () => {
    setLlmStatus("Testing…");
    try {
      const r = await askLLM(s, "Reply with exactly: OK", [{ role: "user", content: "Ping" }]);
      setLlmStatus(`✓ Connected — model replied "${r.trim().slice(0, 40)}"`);
    } catch (e) {
      setLlmStatus(`✕ ${e instanceof Error ? e.message : e}`);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted mt-1">
          Saved only in this browser. API keys are sent with each request to this site&apos;s server, which
          forwards them to the provider and doesn&apos;t store them.
        </p>
      </div>

      {/* Narration */}
      <section className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold">🔊 Narration voice</h2>
          <p className="text-xs text-muted">Reads the question aloud. DeepSeek has no TTS API, so it&apos;s only available for grading.</p>
        </div>
        <div>
          <label className="label">Provider</label>
          <select
            className="input"
            value={tts.provider}
            onChange={(e) => setSettings({ ...s, tts: { ...tts, provider: e.target.value as TTSProvider } })}
          >
            {(Object.keys(TTS_LABELS) as TTSProvider[]).map((p) => (
              <option key={p} value={p}>{TTS_LABELS[p]}</option>
            ))}
          </select>
        </div>

        {tts.provider === "browser" ? (
          <div>
            <label className="label">Voice</label>
            <select
              className="input"
              value={tts.browserVoice}
              onChange={(e) => setSettings({ ...s, tts: { ...tts, browserVoice: e.target.value } })}
            >
              <option value="">System default</option>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>
        ) : (
          ttsCfg && (
            <>
              <KeyField vendor={tts.provider} value={s.keys[tts.provider]} onChange={setKey} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Model</label>
                  <input
                    className="input"
                    value={ttsCfg.model}
                    onChange={(e) => setTtsCfg(s, setSettings, tts.provider as Exclude<TTSProvider, "browser">, { model: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Voice</label>
                  <input
                    className="input"
                    value={ttsCfg.voice}
                    onChange={(e) => setTtsCfg(s, setSettings, tts.provider as Exclude<TTSProvider, "browser">, { voice: e.target.value })}
                  />
                  <p className="text-xs text-muted mt-1">{TTS_VOICE_HINTS[tts.provider]}</p>
                </div>
              </div>
            </>
          )
        )}

        <div>
          <label className="label">Speed: {tts.rate.toFixed(2)}×</label>
          <input
            type="range"
            min={0.7}
            max={1.5}
            step={0.05}
            value={tts.rate}
            onChange={(e) => setSettings({ ...s, tts: { ...tts, rate: Number(e.target.value) } })}
            className="w-full accent-[var(--accent)]"
          />
        </div>

        <Toggle
          checked={s.allowReplay}
          onChange={(v) => setSettings({ ...s, allowReplay: v })}
          label="Allow replaying the question"
          hint="Off = true interview mode: you hear it once."
        />

        <div className="flex items-center gap-3">
          <button className="btn" onClick={testVoice}>Test voice</button>
          <span className={`text-sm ${ttsStatus.startsWith("✕") ? "text-bad" : "text-muted"}`}>{ttsStatus}</span>
        </div>
      </section>

      {/* LLM */}
      <section className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold">🧑‍💼 Interviewer & grader model</h2>
          <p className="text-xs text-muted">Answers your detail-checking questions and grades your answer against the solution.</p>
        </div>
        <div>
          <label className="label">Provider</label>
          <select
            className="input"
            value={llm.provider}
            onChange={(e) => setSettings({ ...s, llm: { ...llm, provider: e.target.value as LLMProvider } })}
          >
            {(Object.keys(LLM_LABELS) as LLMProvider[]).map((p) => (
              <option key={p} value={p}>{LLM_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <KeyField vendor={llm.provider} value={s.keys[llm.provider]} onChange={setKey} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Model</label>
            <input
              className="input"
              value={llmCfg.model}
              placeholder="model name"
              onChange={(e) => setLlmCfg(s, setSettings, llm.provider, { model: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Base URL</label>
            <input
              className="input"
              value={llmCfg.baseUrl}
              placeholder="https://…/v1"
              onChange={(e) => setLlmCfg(s, setSettings, llm.provider, { baseUrl: e.target.value })}
            />
            {llm.provider === "zhipu" && (
              <p className="text-xs text-muted mt-1">Outside China (z.ai)? Use https://api.z.ai/api/paas/v4</p>
            )}
          </div>
        </div>

        <Toggle
          checked={s.speakReplies}
          onChange={(v) => setSettings({ ...s, speakReplies: v })}
          label="Read interviewer replies aloud"
          hint="Uses the narration voice above."
        />

        <div className="flex items-center gap-3">
          <button className="btn" onClick={testLLM}>Test connection</button>
          <span className={`text-sm ${llmStatus.startsWith("✕") ? "text-bad" : "text-muted"}`}>{llmStatus}</span>
        </div>
      </section>
    </div>
  );
}

function setTtsCfg(
  s: Settings,
  set: (s: Settings) => void,
  p: Exclude<TTSProvider, "browser">,
  patch: Partial<Settings["tts"]["configs"]["zhipu"]>,
) {
  set({ ...s, tts: { ...s.tts, configs: { ...s.tts.configs, [p]: { ...s.tts.configs[p], ...patch } } } });
}

function setLlmCfg(
  s: Settings,
  set: (s: Settings) => void,
  p: LLMProvider,
  patch: Partial<Settings["llm"]["configs"]["zhipu"]>,
) {
  set({ ...s, llm: { ...s.llm, configs: { ...s.llm.configs, [p]: { ...s.llm.configs[p], ...patch } } } });
}

function KeyField({
  vendor,
  value,
  onChange,
}: {
  vendor: Vendor;
  value: string;
  onChange: (v: Vendor, key: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label">
        {VENDOR_LABELS[vendor]} API key{" "}
        {KEY_LINKS[vendor] && (
          <a href={KEY_LINKS[vendor]} target="_blank" rel="noreferrer" className="font-normal underline">
            get one
          </a>
        )}
      </label>
      <div className="flex gap-2">
        <input
          className="input font-mono"
          type={show ? "text" : "password"}
          value={value}
          autoComplete="off"
          placeholder="Paste your key"
          onChange={(e) => onChange(vendor, e.target.value)}
        />
        <button className="btn btn-ghost" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[var(--accent)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}
