"use client";

import { useMemo } from "react";
import { decodeShare } from "@/lib/share";
import { newId } from "@/lib/storage";
import type { Question } from "@/lib/types";
import { go } from "./App";

export function ImportShared({
  data,
  setBank,
}: {
  data: string;
  setBank: (u: (prev: Question[]) => Question[]) => void;
}) {
  const items = useMemo(() => {
    try {
      return decodeShare(data);
    } catch {
      return null;
    }
  }, [data]);

  if (!items || !items.length)
    return (
      <div className="card p-8 text-center">
        <p className="text-muted mb-4">This share link is invalid or empty.</p>
        <a className="btn" href="#/">Go to bank</a>
      </div>
    );

  const add = (practiceFirst: boolean) => {
    const added = items.map((q) => ({ ...q, id: newId(), createdAt: Date.now(), attempts: [] }));
    setBank((prev) => [...added, ...prev]);
    go(practiceFirst && added.length === 1 ? `/practice/${added[0].id}` : "/");
  };

  return (
    <div className="card p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">
        Someone shared {items.length === 1 ? "a question" : `${items.length} questions`} with you
      </h1>
      <ul className="text-sm space-y-1">
        {items.map((q, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted">•</span>
            <span>{q.title}</span>
            {q.tags.length > 0 && <span className="text-muted">({q.tags.join(", ")})</span>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">The question text stays hidden until you practice it.</p>
      <div className="flex gap-2 justify-end">
        <a className="btn btn-ghost" href="#/">Skip</a>
        <button className="btn" onClick={() => add(false)}>Add to my bank</button>
        {items.length === 1 && (
          <button className="btn btn-primary" onClick={() => add(true)}>Add & practice now</button>
        )}
      </div>
    </div>
  );
}
