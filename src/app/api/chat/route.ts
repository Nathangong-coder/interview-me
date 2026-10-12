import type { ChatMessage, LLMProvider } from "@/lib/types";

type Body = {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  system: string;
  messages: ChatMessage[];
};

/**
 * Stateless proxy: forwards the user's own API key to the chosen provider.
 * Keys are never stored or logged server-side.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { provider, apiKey, model, system, messages } = body;
  const baseUrl = (body.baseUrl || "").replace(/\/+$/, "");
  if (!apiKey) return Response.json({ error: "Missing API key — add one in Settings." }, { status: 400 });
  if (!model) return Response.json({ error: "Missing model name — set one in Settings." }, { status: 400 });
  if (!baseUrl) return Response.json({ error: "Missing base URL — set one in Settings." }, { status: 400 });

  try {
    const text =
      provider === "anthropic"
        ? await callAnthropic(baseUrl, apiKey, model, system, messages)
        : await callOpenAICompatible(provider, baseUrl, apiKey, model, system, messages);
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

async function callOpenAICompatible(
  provider: LLMProvider,
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
) {
  const payload: Record<string, unknown> = {
    model,
    messages: [{ role: "system", content: system }, ...messages],
  };
  // GLM-4.5+ think by default; skip it for snappier interviewer replies.
  if (provider === "zhipu") payload.thinking = { type: "disabled" };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(errorMessage(res.status, data));
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Provider returned no text.");
  return content;
}

async function callAnthropic(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
) {
  const res = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 2048, system, messages }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(errorMessage(res.status, data));
  const blocks: { type: string; text?: string }[] = data?.content ?? [];
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function errorMessage(status: number, data: unknown) {
  const d = data as { error?: { message?: string } | string; message?: string } | null;
  const msg =
    (typeof d?.error === "object" ? d.error?.message : d?.error) ?? d?.message ?? "Request failed";
  const hint =
    status === 404
      ? " — this model isn't available for your key. Pick another model in Settings (or use “Load from my account”)."
      : status === 401
        ? " — check your API key (and for Zhipu, the China/International region) in Settings."
        : "";
  return `Provider error ${status}: ${msg}${hint}`;
}
