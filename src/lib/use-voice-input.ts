"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser-native voice input via the Web Speech API.
 *
 * Chrome and Safari support `SpeechRecognition` (Safari prefixed). Firefox
 * doesn't ship it — `supported` will be false, and the hook degrades to a
 * no-op so the caller can hide the mic button.
 *
 * Lifecycle:
 *   start()  → listening = true, interim transcript streams via `interim`
 *              final transcript fires `onFinal`
 *   stop()   → listening = false; whatever's been recognized so far ends as final
 *   onresult / onerror / onend handlers are wired internally
 *
 * Permissions: the browser asks for mic access on first use; if denied,
 * `onError` fires with "not-allowed" and listening stops cleanly.
 */

/* Minimal types — the official DOM types ship this as SpeechRecognition,
 * but @types/dom currently doesn't include it in lib.dom.d.ts. */
type SREvent = {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >;
};
type SRErrorEvent = { error: string };

interface SRInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SRConstructor = new () => SRInstance;

declare global {
  interface Window {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  }
}

export type VoiceInput = {
  supported: boolean;
  listening: boolean;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
};

export function useVoiceInput(options: {
  onFinal: (text: string) => void;
  lang?: string;
}): VoiceInput {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SRInstance | null>(null);
  const onFinalRef = useRef(options.onFinal);
  onFinalRef.current = options.onFinal;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSupported(Boolean(SR));
  }, []);

  // Hard cleanup if the component unmounts while listening.
  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    setError(null);
    setInterim("");

    const rec = new SR();
    rec.lang = options.lang ?? navigator.language ?? "en-US";
    rec.continuous = false; // single utterance
    rec.interimResults = true;

    rec.onstart = () => setListening(true);
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.onerror = (e) => {
      setError(e.error || "Voice input failed");
      setListening(false);
    };
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const chunk = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += chunk;
        else interimText += chunk;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        setInterim("");
        onFinalRef.current(finalText.trim());
      }
    };

    try {
      rec.start();
      recRef.current = rec;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start mic");
      setListening(false);
    }
  }, [options.lang]);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  return { supported, listening, interim, error, start, stop };
}
