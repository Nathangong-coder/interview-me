import type { LLMProvider } from "@/lib/types";

type Body = { provider: LLMProvider; apiKey: string; baseUrl: string };

// Models that can't act as a chat interviewer/grader.
const NON_CHAT = /embed|tts|audio|image|vision-exp|dall-e|whisper|moderation|realtime|transcribe|speech|asr|ocr|video|cogview|search|rerank|babbage|davinci|veo|imagen|lyria/i;

/** Lists the chat models the user's key can actually access. */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { provider, apiKey } = body;
  const baseUrl = (body.baseUrl || "").replace(/\/+$/, "");
  if (!apiKey) return Response.json({ error: "Add your API key first." }, { status: 400 });
  if (!baseUrl) return Response.json({ error: "Missing base URL." }, { status: 400 });

  try {
    const res = await fetch(`${baseUrl}/models${provider === "anthropic" ? "?limit=100" : ""}`, {
      headers:
        provider === "anthropic"
          ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
          : { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.error?.message ?? data?.error ?? data?.message ?? "Request failed";
      throw new Error(
        res.status === 404
          ? "This provider doesn't support listing models — pick one from the list."
          : `Provider error ${res.status}: ${msg}`,
      );
    }
    const raw: { id: string; display_name?: string }[] = data?.data ?? [];
    const models = raw
      .map((m) => ({ id: m.id.replace(/^models\//, ""), label: m.display_name ?? m.id.replace(/^models\//, "") }))
      .filter((m) => !NON_CHAT.test(m.id))
      .sort((a, b) => a.id.localeCompare(b.id));
    return Response.json({ models });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
