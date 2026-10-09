"use client";

/**
 * Speak or type an answer (web.md §11.6): the browser's own speech
 * recognition where it exists (Chrome, Edge), typing always works. No
 * audio is recorded or uploaded — only the transcript and how long it took,
 * matching the backend's own "transcribed on the device" design.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** The small slice of the Web Speech API this needs; not in lib.dom.d.ts. */
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly [index: number]: { readonly transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return typeof ctor === "function" ? (ctor as SpeechRecognitionCtor) : null;
}

export type RecorderStatus = "idle" | "recording" | "stopped";

export function useSpeechRecorder() {
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const startedAtRef = useRef<number>(0);
  const finalRef = useRef("");

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
    },
    [],
  );

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Voice recording isn't available in this browser. Type your answer instead.");
      return;
    }
    setError(null);
    finalRef.current = "";
    setTranscript("");
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalRef.current += `${result[0].transcript} `;
        else interim += result[0].transcript;
      }
      setTranscript(`${finalRef.current}${interim}`.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      setError(
        event.error === "not-allowed"
          ? "Microphone access was blocked. Allow it, or type your answer instead."
          : "Recording stopped unexpectedly. Try again, or type your answer.",
      );
      setStatus("stopped");
    };
    recognition.onend = () =>
      setStatus((current) => (current === "recording" ? "stopped" : current));
    recognitionRef.current = recognition;
    startedAtRef.current = Date.now();
    recognition.start();
    setStatus("recording");
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus("stopped");
  }, []);

  const reset = useCallback(() => {
    recognitionRef.current?.stop();
    finalRef.current = "";
    setTranscript("");
    setError(null);
    setStatus("idle");
  }, []);

  function durationSeconds(): number {
    return Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
  }

  return {
    supported,
    status,
    transcript,
    error,
    start,
    stop,
    reset,
    durationSeconds,
    setTranscript,
  };
}
