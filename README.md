# Interview Me 🎧

Practice interview questions the way they're actually asked: **you hear the question once, then it's hidden.**

1. **Question bank**: save questions (plus an optional reference solution and tags).
2. **Practice**: the question is narrated once, then locked.
3. **Ask the interviewer**: check details ("Is n up to 10^5? Can there be duplicates?"). The AI confirms or corrects facts but never hints at the solution.
4. **Submit your answer**: the AI grades your steps against the reference solution (correct / partial / incorrect, score, what's missing). The question and solution are then revealed. You can also **give up** to reveal them.

## Providers (bring your own key — set in **Settings**)

| | Narration (TTS) | Interviewer / grader |
|---|---|---|
| Browser built-in (free, no key) | ✅ | — |
| Zhipu GLM | ✅ `glm-tts` | ✅ `glm-4.5-flash` (free tier) |
| DeepSeek | — (no TTS API) | ✅ |
| OpenAI | ✅ | ✅ |
| Anthropic Claude | — | ✅ |
| Google Gemini | ✅ | ✅ |
| ElevenLabs | ✅ | — |
| Any OpenAI-compatible endpoint | — | ✅ |

Model names, voices, and base URLs are all editable in Settings.

**Privacy:** API keys and the question bank live in your browser's localStorage. The `/api/chat` and `/api/tts` routes forward each request to the provider using your key; nothing is stored on the server.

## Sharing

- **Share** on a question (or **Share all**) copies a link that contains the questions. Whoever opens it can add them to their own bank.
- **Export / Import** saves and loads your whole bank as JSON.

## Run locally

```bash
npm install
npm run dev   # http://localhost:3000
```

## Deploy to Vercel

No environment variables are needed.

```bash
npm i -g vercel
vercel        # preview
vercel --prod # production
```

Or push to GitHub and import the repo at https://vercel.com/new.

Dictation (🎤) uses the browser's speech recognition, which works in Chrome, Edge, and Safari.
