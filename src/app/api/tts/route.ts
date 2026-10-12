type Body = {
  provider: "zhipu" | "openai" | "gemini" | "elevenlabs";
  apiKey: string;
  model: string;
  voice: string;
  text: string;
  speed?: number;
  baseUrl?: string;
};

/** Stateless proxy that turns text into audio with the user's own key. */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { provider, apiKey, model, voice, text } = body;
  const speed = body.speed ?? 1;
  if (!apiKey) return Response.json({ error: "Missing API key — add one in Settings." }, { status: 400 });
  if (!text) return Response.json({ error: "No text" }, { status: 400 });

  try {
    switch (provider) {
      case "zhipu": {
        const base = (body.baseUrl || "https://open.bigmodel.cn/api/paas/v4").replace(/\/+$/, "");
        const res = await fetch(`${base}/audio/speech`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            input: text,
            voice,
            speed: clamp(speed, 0.5, 2),
            response_format: "wav",
          }),
        });
        return await audio(res, "audio/wav");
      }
      case "openai": {
        const res = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            input: text,
            voice,
            speed: clamp(speed, 0.25, 4),
            response_format: "mp3",
          }),
        });
        return await audio(res, "audio/mpeg");
      }
      case "elevenlabs": {
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "xi-api-key": apiKey, Accept: "audio/mpeg" },
            body: JSON.stringify({
              text,
              model_id: model,
              voice_settings: { speed: clamp(speed, 0.7, 1.2) },
            }),
          },
        );
        return await audio(res, "audio/mpeg");
      }
      case "gemini": {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Read this aloud clearly, like an interviewer:\n\n${text}` }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
              },
            }),
          },
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(`Provider error ${res.status}: ${data?.error?.message ?? "Request failed"}`);
        const part = data?.candidates?.[0]?.content?.parts?.find(
          (p: { inlineData?: { data: string } }) => p.inlineData,
        );
        if (!part) throw new Error("Gemini returned no audio.");
        const pcm = Buffer.from(part.inlineData.data, "base64");
        const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType ?? "")?.[1]) || 24000;
        return new Response(new Uint8Array(pcmToWav(pcm, rate)), {
          headers: { "Content-Type": "audio/wav" },
        });
      }
      default:
        return Response.json({ error: `Unknown TTS provider: ${provider}` }, { status: 400 });
    }
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

async function audio(res: Response, fallbackType: string) {
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j?.error?.message ?? j?.detail?.message ?? j?.message ?? text;
    } catch {}
    throw new Error(`Provider error ${res.status}: ${String(msg).slice(0, 300)}`);
  }
  const buf = await res.arrayBuffer();
  return new Response(buf, {
    headers: { "Content-Type": res.headers.get("content-type")?.startsWith("audio") ? res.headers.get("content-type")! : fallbackType },
  });
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Wrap 16-bit mono PCM in a WAV header so browsers can play it. */
function pcmToWav(pcm: Buffer, sampleRate: number) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
