"use client";

import { useEffect, useRef, useState } from "react";
import { getSpeechRecognition } from "@/lib/client";

/** Dictation button (Chrome/Edge/Safari). Calls onText with each finalized phrase. */
export function MicButton({ onText }: { onText: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection after mount
    setSupported(!!getSpeechRecognition());
    return () => recRef.current?.stop();
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR = getSpeechRecognition()!;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) onTextRef.current(e.results[i][0].transcript.trim());
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "Stop dictation" : "Dictate with your voice"}
      className={`btn ${listening ? "btn-danger animate-pulse" : "btn-ghost"}`}
    >
      {listening ? "● Listening" : "🎤 Dictate"}
    </button>
  );
}
