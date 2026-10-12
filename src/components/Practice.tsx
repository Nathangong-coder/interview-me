"use client";

import { useEffect, useRef, useState } from "react";
import { askLLM, narrate, type Narration } from "@/lib/client";
import { LLM_LABELS, TTS_LABELS } from "@/lib/defaults";
import { graderPrompt, interviewerPrompt, parseGrade } from "@/lib/prompts";
import type { ChatMessage, GradeResult, Question, Settings, Verdict } from "@/lib/types";
import { MicButton } from "./MicButton";

type Phase = "ready" | "narrating" | "working" | "done";

const VERDICT_UI: Record<Verdict, { label: string; cls: string }> = {
  correct: { label: "Correct", cls: "text-good border-good" },
  partial: { label: "Partially correct", cls: "text-warn border-warn" },
  incorrect: { label: "Incorrect", cls: "text-bad border-bad" },
  gave_up: { label: "Gave up", cls: "text-muted border-border" },
};

export function Practice({
  question: q,
  setBank,
  settings,
}: {
  question: Question;
  setBank: (u: (prev: Question[]) => Question[]) => void;
  settings: Settings;
}) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [plays, setPlays] = useState(0);
  const [narrError, setNarrError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState("");
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const narrationRef = useRef<Narration | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => narrationRef.current?.stop(), []);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, chatBusy]);

  const llmProvider = settings.llm.provider;
  const hasLLMKey = !!settings.keys[llmProvider];
  const ttsProvider = settings.tts.provider;
  const canReplay = settings.allowReplay || plays === 0 || !!narrError;

  const play = async () => {
    narrationRef.current?.stop();
    setNarrError("");
    setPhase((p) => (p === "done" ? p : "narrating"));
    const n = narrate(q.question, settings);
    narrationRef.current = n;
    try {
      await n.done;
      setPlays((c) => c + 1);
    } catch (e) {
      setNarrError(e instanceof Error ? e.message : String(e));
    } finally {
      setPhase((p) => (p === "done" ? p : "working"));
    }
  };

  const stopNarration = () => narrationRef.current?.stop();

  const send = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setChatInput("");
    setChatBusy(true);
    setChatError("");
    try {
      const reply = await askLLM(settings, interviewerPrompt(q), next);
      setMessages([...next, { role: "assistant", content: reply }]);
      if (settings.speakReplies) {
        narrationRef.current?.stop();
        narrationRef.current = narrate(reply, settings);
        narrationRef.current.done.catch(() => {});
      }
    } catch (e) {
      setChatError(e instanceof Error ? e.message : String(e));
      setMessages(messages);
      setChatInput(text);
    } finally {
      setChatBusy(false);
    }
  };

  const record = (verdict: Verdict, score?: number) =>
    setBank((prev) =>
      prev.map((x) => (x.id === q.id ? { ...x, attempts: [...x.attempts, { at: Date.now(), verdict, score }] } : x)),
    );

  const submit = async () => {
    if (!answer.trim()) return;
    setGrading(true);
    setGradeError("");
    try {
      const text = await askLLM(settings, graderPrompt(q), [
        { role: "user", content: `My answer:\n\n${answer.trim()}` },
      ]);
      const g = parseGrade(text);
      setGrade(g);
      record(g.verdict, g.score);
      narrationRef.current?.stop();
      setPhase("done");
    } catch (e) {
      setGradeError(e instanceof Error ? e.message : String(e));
    } finally {
      setGrading(false);
    }
  };

  const giveUp = () => {
    if (!confirm("Give up and reveal the question and solution?")) return;
    narrationRef.current?.stop();
    setGaveUp(true);
    record("gave_up");
    setPhase("done");
  };

  const reset = () => {
    narrationRef.current?.stop();
    setPhase("ready");
    setPlays(0);
    setMessages([]);
    setAnswer("");
    setGrade(null);
    setGaveUp(false);
    setGradeError("");
    setChatError("");
    setNarrError("");
  };

  const append = (setter: (fn: (v: string) => string) => void) => (text: string) =>
    setter((v) => (v && !/\s$/.test(v) ? v + " " : v) + text);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <a href="#/" className="text-sm text-muted hover:text-foreground">← Bank</a>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{q.title}</h1>
          <p className="text-xs text-muted mt-1">
            Voice: {TTS_LABELS[ttsProvider]} · Interviewer & grader: {LLM_LABELS[llmProvider]} (
            {settings.llm.configs[llmProvider].model || "no model"}) ·{" "}
            <a href="#/settings" className="underline">change</a>
          </p>
        </div>
        {phase === "done" && (
          <button className="btn" onClick={reset}>↺ Try again</button>
        )}
      </div>

      {/* Question card */}
      <section className="card p-5">
        {phase === "done" ? (
          <>
            <div className="label">Question</div>
            <p className="whitespace-pre-wrap leading-relaxed">{q.question}</p>
          </>
        ) : phase === "ready" ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted">
              The question will be read aloud <strong>once</strong>
              {settings.allowReplay ? " (replays are enabled in Settings)" : ""}. Have a notepad ready.
            </p>
            <button className="btn btn-primary text-base px-6 py-3" onClick={play}>
              ▶ Start — read me the question
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {phase === "narrating" ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
                  </span>
                  <span>Narrating… listen carefully</span>
                </>
              ) : (
                <span className="text-muted">
                  🔒 Question hidden. Heard {plays} time{plays === 1 ? "" : "s"}.
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {phase === "narrating" ? (
                <button className="btn" onClick={stopNarration}>■ Stop</button>
              ) : (
                canReplay && (
                  <button className="btn" onClick={play}>
                    {plays === 0 ? "▶ Play" : "↻ Replay"}
                  </button>
                )
              )}
            </div>
          </div>
        )}
        {narrError && (
          <p className="text-sm text-bad mt-3">
            Narration failed: {narrError}{" "}
            <a href="#/settings" className="underline">Check settings</a>
          </p>
        )}
      </section>

      {phase === "done" && (
        <Results grade={grade} gaveUp={gaveUp} solution={q.solution} />
      )}

      {phase !== "ready" && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Interviewer chat */}
          <section className="card flex flex-col h-[28rem]">
            <div className="px-4 py-3 border-b border-border">
              <div className="font-medium">Ask the interviewer</div>
              <div className="text-xs text-muted">
                Check the details you heard — &quot;Is n up to 10^5?&quot; or restate the whole problem. No hints given.
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              {messages.length === 0 && (
                <p className="text-muted text-center mt-8">
                  {hasLLMKey
                    ? "Try: \"So I have a grid up to 1000×1000, I can break at most K walls — right?\""
                    : <>Add a {LLM_LABELS[llmProvider]} API key in <a className="underline" href="#/settings">Settings</a> to chat.</>}
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 whitespace-pre-wrap ${
                      m.role === "user" ? "bg-accent text-[var(--accent-fg)]" : "bg-foreground/5"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatBusy && <div className="text-muted text-xs">Interviewer is typing…</div>}
              {chatError && <div className="text-bad text-xs">{chatError}</div>}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <input
                className="input"
                placeholder={hasLLMKey ? "Ask about a detail…" : "Add an API key in Settings first"}
                value={chatInput}
                disabled={!hasLLMKey}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              />
              <MicButton onText={append(setChatInput)} />
              <button className="btn btn-primary" onClick={send} disabled={!chatInput.trim() || chatBusy || !hasLLMKey}>
                Send
              </button>
            </div>
          </section>

          {/* Answer */}
          <section className="card flex flex-col h-[28rem]">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">Your answer</div>
                <div className="text-xs text-muted">Steps, pseudocode, or code — the AI compares it to the solution.</div>
              </div>
              <MicButton onText={append(setAnswer)} />
            </div>
            <textarea
              className="flex-1 p-4 bg-transparent resize-none font-mono text-sm outline-none"
              placeholder={"1. Model the state as …\n2. …\n\nTime: O(…)  Space: O(…)"}
              value={answer}
              readOnly={phase === "done"}
              onChange={(e) => setAnswer(e.target.value)}
            />
            {phase !== "done" && (
              <div className="p-3 border-t border-border flex items-center justify-between gap-2">
                <button className="btn btn-ghost btn-danger" onClick={giveUp}>Give up</button>
                <div className="flex items-center gap-2">
                  {gradeError && <span className="text-xs text-bad max-w-56 truncate" title={gradeError}>{gradeError}</span>}
                  <button className="btn btn-primary" onClick={submit} disabled={!answer.trim() || grading || !hasLLMKey}>
                    {grading ? "Grading…" : "Submit for grading"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Results({
  grade,
  gaveUp,
  solution,
}: {
  grade: GradeResult | null;
  gaveUp: boolean;
  solution: string;
}) {
  const verdict: Verdict = gaveUp ? "gave_up" : grade?.verdict ?? "partial";
  const ui = VERDICT_UI[verdict];
  const list = (title: string, items: string[], cls: string) =>
    items.length > 0 && (
      <div>
        <div className={`label ${cls}`}>{title}</div>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {items.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>
    );

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${ui.cls}`}>{ui.label}</span>
        {grade && <span className="text-2xl font-semibold">{grade.score}<span className="text-muted text-base">/100</span></span>}
      </div>
      {grade?.summary && <p className="leading-relaxed">{grade.summary}</p>}
      {grade && (
        <div className="grid gap-4 md:grid-cols-3">
          {list("✓ Got right", grade.correct, "text-good")}
          {list("○ Missing", grade.missing, "text-warn")}
          {list("✕ Mistakes", grade.mistakes, "text-bad")}
        </div>
      )}
      <div>
        <div className="label">Reference solution</div>
        {solution ? (
          <pre className="whitespace-pre-wrap font-mono text-sm bg-foreground/5 rounded-lg p-3">{solution}</pre>
        ) : (
          <p className="text-sm text-muted">No reference solution saved for this question.</p>
        )}
      </div>
    </section>
  );
}
