"use client";

import { useRef, useState } from "react";
import { narrate, type Narration } from "@/lib/client";
import { newId } from "@/lib/storage";
import type { Question, Settings } from "@/lib/types";
import { go } from "./App";
import { MicButton } from "./MicButton";

export function Editor({
  existing,
  setBank,
  settings,
}: {
  existing?: Question;
  setBank: (u: (prev: Question[]) => Question[]) => void;
  settings: Settings;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [question, setQuestion] = useState(existing?.question ?? "");
  const [solution, setSolution] = useState(existing?.solution ?? "");
  const [tags, setTags] = useState(existing?.tags.join(", ") ?? "");
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");
  const narrationRef = useRef<Narration | null>(null);

  const save = (thenPractice: boolean) => {
    if (!question.trim()) return setError("The question can't be empty.");
    const id = existing?.id ?? newId();
    const q: Question = {
      id,
      title: title.trim() || question.trim().slice(0, 60) + (question.length > 60 ? "…" : ""),
      question: question.trim(),
      solution: solution.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: existing?.createdAt ?? Date.now(),
      attempts: existing?.attempts ?? [],
    };
    setBank((prev) => (existing ? prev.map((x) => (x.id === id ? q : x)) : [q, ...prev]));
    go(thenPractice ? `/practice/${id}` : "/");
  };

  const preview = async () => {
    if (previewing) {
      narrationRef.current?.stop();
      return;
    }
    setError("");
    setPreviewing(true);
    const n = narrate(question, settings);
    narrationRef.current = n;
    try {
      await n.done;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPreviewing(false);
    }
  };

  const append = (setter: (fn: (v: string) => string) => void) => (text: string) =>
    setter((v) => (v && !v.endsWith(" ") && !v.endsWith("\n") ? v + " " : v) + text);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <a href="#/" className="text-sm text-muted hover:text-foreground">← Back</a>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          {existing ? "Edit question" : "New question"}
        </h1>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Title (shown in the bank — keep it spoiler-free)</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Warehouse robot routing" />
        </div>
        <div>
          <div className="flex items-end justify-between mb-1">
            <label className="label mb-0">Question (this gets narrated, then hidden)</label>
            <div className="flex gap-2">
              <MicButton onText={append(setQuestion)} />
              <button className="btn btn-ghost" onClick={preview} disabled={!question.trim()}>
                {previewing ? "■ Stop" : "🔊 Preview voice"}
              </button>
            </div>
          </div>
          <textarea
            className="input min-h-48 font-mono text-sm"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Paste the full interview question…"
          />
        </div>
        <div>
          <div className="flex items-end justify-between mb-1">
            <label className="label mb-0">Reference solution (optional — used by the grader, never shown to the interviewer chat)</label>
            <MicButton onText={append(setSolution)} />
          </div>
          <textarea
            className="input min-h-36 font-mono text-sm"
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder="Key steps, approach, complexity, edge cases, or code. Without it, the AI grades from its own knowledge."
          />
        </div>
        <div>
          <label className="label">Tags (comma-separated)</label>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="graphs, dp, system design" />
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
        <div className="flex gap-2 justify-end">
          <a className="btn btn-ghost" href="#/">Cancel</a>
          <button className="btn" onClick={() => save(false)}>Save</button>
          <button className="btn btn-primary" onClick={() => save(true)}>Save & practice</button>
        </div>
      </div>
    </div>
  );
}
