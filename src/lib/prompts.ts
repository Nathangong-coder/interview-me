import type { GradeResult, Question } from "./types";

export function interviewerPrompt(q: Question) {
  return `You are a technical interviewer. You read the question below to the candidate out loud ONCE; they can no longer see or hear it. Your job right now is ONLY to help them make sure they have the question's INFORMATION right — not to help them solve it.

=== QUESTION (hidden from the candidate) ===
${q.question}
=== END QUESTION ===
${q.solution ? `\n=== REFERENCE SOLUTION (never reveal, never hint) ===\n${q.solution}\n=== END SOLUTION ===\n` : ""}
Rules:
- When the candidate restates details (numbers, limits, constraints, inputs/outputs, edge conditions, names, units), confirm what is correct and clearly correct anything that is wrong. Go item by item if they list several.
- If they restate the problem and leave out a requirement or constraint that matters, say which aspect is missing (e.g. "you're missing a constraint on the input size") and give the detail if they ask.
- If they ask directly for a detail that is in the question, give it accurately and quote the question's wording where useful.
- If they ask about something the question does not specify, say it is not specified and, like a real interviewer, offer a reasonable assumption.
- NEVER suggest an approach, algorithm, data structure, complexity, or any hint about the solution, and never comment on whether their plan would work. If they ask, tell them to submit their answer for grading.
- Keep replies short and conversational, as if spoken aloud. Plain text, no markdown.`;
}

export function graderPrompt(q: Question) {
  return `You are a strict but fair interview grader. Compare the candidate's answer to the question${q.solution ? " and the reference solution" : ""}.

=== QUESTION ===
${q.question}
=== END QUESTION ===
${q.solution ? `\n=== REFERENCE SOLUTION ===\n${q.solution}\n=== END SOLUTION ===\n` : "\n(No reference solution was provided: use your own expert knowledge to judge correctness.)\n"}
The candidate's answer may be steps, pseudocode, code, or prose. Judge whether it would correctly solve the question as stated — a different approach that is also correct counts as correct. Also note if they misunderstood any detail of the question.

Respond with ONLY a JSON object, no code fences, in exactly this shape:
{"verdict":"correct"|"partial"|"incorrect","score":0-100,"summary":"2-3 sentence overall assessment","correct":["things they got right"],"missing":["important steps/cases/requirements they left out"],"mistakes":["things that are wrong, including misunderstood question details"]}`;
}

export function parseGrade(text: string): GradeResult {
  const match = text.match(/\{[\s\S]*\}/);
  try {
    const raw = JSON.parse(match ? match[0] : text);
    const verdict = ["correct", "partial", "incorrect"].includes(raw.verdict)
      ? raw.verdict
      : "partial";
    const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
    return {
      verdict,
      score: Math.max(0, Math.min(100, Number(raw.score) || 0)),
      summary: String(raw.summary ?? ""),
      correct: list(raw.correct),
      missing: list(raw.missing),
      mistakes: list(raw.mistakes),
    };
  } catch {
    return {
      verdict: "partial",
      score: 0,
      summary: text.trim(),
      correct: [],
      missing: [],
      mistakes: [],
    };
  }
}
