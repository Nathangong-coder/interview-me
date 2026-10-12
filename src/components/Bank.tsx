"use client";

import { useMemo, useRef, useState } from "react";
import { newId } from "@/lib/storage";
import { encodeShare, normalizeImport } from "@/lib/share";
import type { Question } from "@/lib/types";

const VERDICT_STYLE: Record<string, string> = {
  correct: "text-good",
  partial: "text-warn",
  incorrect: "text-bad",
  gave_up: "text-muted",
};

export function Bank({
  bank,
  setBank,
}: {
  bank: Question[];
  setBank: (u: (prev: Question[]) => Question[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const tags = useMemo(() => [...new Set(bank.flatMap((q) => q.tags))].sort(), [bank]);
  // Search titles and tags only — searching question text would spoil it.
  const filtered = bank.filter(
    (q) =>
      (!tag || q.tags.includes(tag)) &&
      (!search ||
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))),
  );

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const share = async (qs: Question[]) => {
    const url = `${location.origin}${location.pathname}#/import/${encodeShare(qs)}`;
    try {
      await navigator.clipboard.writeText(url);
      flash(qs.length === 1 ? "Share link copied" : `Share link for ${qs.length} questions copied`);
    } catch {
      prompt("Copy this link:", url);
    }
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(bank, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "interview-me-questions.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (file: File) => {
    try {
      const items = normalizeImport(JSON.parse(await file.text()));
      setBank((prev) => [
        ...items.map((q) => ({ ...q, id: newId(), createdAt: Date.now(), attempts: [] })),
        ...prev,
      ]);
      flash(`Imported ${items.length} question${items.length === 1 ? "" : "s"}`);
    } catch {
      flash("That file isn't valid question JSON");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Question bank</h1>
          <p className="text-muted text-sm mt-1">
            Pick a question — you&apos;ll hear it once, then it&apos;s hidden.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Import
          </button>
          <button className="btn btn-ghost" onClick={exportAll} disabled={!bank.length}>
            Export
          </button>
          <button className="btn btn-ghost" onClick={() => share(filtered)} disabled={!filtered.length}>
            Share {tag || search ? "filtered" : "all"}
          </button>
          <a className="btn btn-primary" href="#/new">
            + New question
          </a>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="input max-w-xs"
          placeholder="Search titles & tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setTag(tag === t ? null : t)}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              tag === t ? "bg-accent text-[var(--accent-fg)] border-accent" : "border-border text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          {bank.length ? "No questions match." : "Your bank is empty — add your first question."}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((q) => {
            const last = q.attempts[q.attempts.length - 1];
            return (
              <li key={q.id} className="card p-4 flex flex-col gap-3">
                <div className="flex-1">
                  <div className="font-medium">{q.title}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
                    {q.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-foreground/5 text-muted">
                        {t}
                      </span>
                    ))}
                    {!q.solution && <span className="px-2 py-0.5 rounded-full text-warn">no solution</span>}
                  </div>
                  <div className="text-xs text-muted mt-2">
                    {q.attempts.length
                      ? <>
                          {q.attempts.length} attempt{q.attempts.length === 1 ? "" : "s"} · last:{" "}
                          <span className={VERDICT_STYLE[last.verdict]}>
                            {last.verdict.replace("_", " ")}
                            {last.score != null ? ` (${last.score})` : ""}
                          </span>
                        </>
                      : "Not attempted yet"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a className="btn btn-primary flex-1 justify-center" href={`#/practice/${q.id}`}>
                    ▶ Practice
                  </a>
                  <a className="btn btn-ghost" href={`#/edit/${q.id}`} title="Edit (shows the question)">
                    Edit
                  </a>
                  <button className="btn btn-ghost" onClick={() => share([q])} title="Copy share link">
                    Share
                  </button>
                  <button
                    className="btn btn-ghost btn-danger"
                    onClick={() => {
                      if (confirm(`Delete "${q.title}"?`)) setBank((prev) => prev.filter((x) => x.id !== q.id));
                    }}
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 card px-4 py-2 text-sm shadow-lg">{toast}</div>
      )}
    </div>
  );
}
