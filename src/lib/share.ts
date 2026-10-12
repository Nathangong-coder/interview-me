import type { Question } from "./types";

type Shared = Pick<Question, "title" | "question" | "solution" | "tags">;

export function encodeShare(qs: Question[]): string {
  const data: Shared[] = qs.map(({ title, question, solution, tags }) => ({ title, question, solution, tags }));
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(s: string): Shared[] {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const data = JSON.parse(new TextDecoder().decode(bytes));
  return normalizeImport(data);
}

/** Accept either a list of questions or a single question; drop anything malformed. */
export function normalizeImport(data: unknown): Shared[] {
  const arr = Array.isArray(data) ? data : [data];
  return arr
    .filter((x) => x && typeof x === "object" && typeof (x as Shared).question === "string")
    .map((x) => {
      const q = x as Partial<Shared>;
      return {
        title: String(q.title || q.question!.slice(0, 60)),
        question: String(q.question),
        solution: String(q.solution ?? ""),
        tags: Array.isArray(q.tags) ? q.tags.map(String) : [],
      };
    });
}
