"use client";

import { MicIcon, SquareIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { transcribeVoiceNoteAction } from "@/lib/creative/actions";
import { MAX_VOICE_SECONDS } from "@/lib/creative/limits";

import { CreativeError } from "./creative-error";
import { Thinking } from "./thinking";
import type { CreativeUiError } from "./use-creative-action";

/** Formatos que graban los navegadores, en orden de preferencia. */
const recordingTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

type Recording = {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  startedAt: number;
  cancelled: boolean;
};

/**
 * Graba una nota de voz de hasta 30 s, la transcribe y entrega el texto para
 * que el dueño lo revise antes de enviarlo. Sin micrófono en el navegador, no
 * se muestra.
 */
export function VoiceNoteButton({
  sessionId,
  disabled,
  onTranscript,
}: {
  sessionId: string;
  disabled?: boolean;
  onTranscript: (text: string) => void;
}) {
  const t = useTranslations("Director.voice");
  const [state, setState] = useState<"idle" | "recording" | "transcribing">(
    "idle",
  );
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<CreativeUiError | null>(null);
  const recording = useRef<Recording | null>(null);

  // Solo el navegador sabe si puede grabar; en el servidor se asume que no,
  // para que la hidratación coincida.
  const supported = useSyncExternalStore(
    noopSubscribe,
    () =>
      typeof MediaRecorder !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      recordingTypes.some((type) => MediaRecorder.isTypeSupported(type)),
    () => false,
  );

  useEffect(() => {
    if (state !== "recording") return;
    const timer = setInterval(() => {
      const current = recording.current;
      if (!current) return;
      const seconds = secondsSince(current.startedAt);
      setElapsed(Math.min(Math.floor(seconds), MAX_VOICE_SECONDS));
      if (seconds >= MAX_VOICE_SECONDS) current.recorder.stop();
    }, 250);
    return () => clearInterval(timer);
  }, [state]);

  // Al salir de la pantalla se suelta el micrófono.
  useEffect(
    () => () => {
      const current = recording.current;
      if (!current) return;
      current.cancelled = true;
      current.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  if (!supported) return null;

  async function start() {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("micDenied");
      return;
    }
    const current = createRecording(stream);
    const recorder = current.recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) current.chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      recording.current = null;
      if (current.cancelled) {
        setState("idle");
        return;
      }
      const seconds = secondsSince(current.startedAt);
      const audio = new Blob(current.chunks, { type: recorder.mimeType });
      void transcribe(audio, seconds);
    };
    recording.current = current;
    recorder.start();
    setElapsed(0);
    setState("recording");
  }

  function stop(cancel = false) {
    const current = recording.current;
    if (!current) return;
    current.cancelled = cancel;
    current.recorder.stop();
  }

  async function transcribe(audio: Blob, seconds: number) {
    setState("transcribing");
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    formData.set("audio", audio, "nota");
    formData.set(
      "durationSeconds",
      String(Math.min(seconds, MAX_VOICE_SECONDS)),
    );
    const result = await transcribeVoiceNoteAction(formData).catch(
      () => ({ ok: false, error: "unexpected" }) as const,
    );
    setState("idle");
    if (result.ok) onTranscript(result.text);
    else setError(result.error);
  }

  return (
    <div className="flex flex-col gap-2">
      {state === "idle" && (
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={start}
          className="w-fit"
        >
          <MicIcon aria-hidden />
          {t("record")}
        </Button>
      )}
      {state === "recording" && (
        <div className="flex flex-wrap items-center gap-2" role="status">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span
              aria-hidden
              className="size-2.5 animate-pulse rounded-full bg-red-500"
            />
            {t("recording", {
              seconds: elapsed,
              max: MAX_VOICE_SECONDS,
            })}
          </span>
          <Button type="button" size="sm" onClick={() => stop()}>
            <SquareIcon aria-hidden />
            {t("stop")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => stop(true)}
          >
            <XIcon aria-hidden />
            {t("cancel")}
          </Button>
        </div>
      )}
      {state === "transcribing" && <Thinking label={t("transcribing")} />}
      <CreativeError error={error} />
    </div>
  );
}

function createRecording(stream: MediaStream): Recording {
  const mimeType = recordingTypes.find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
  return {
    recorder: new MediaRecorder(stream, { mimeType }),
    stream,
    chunks: [],
    startedAt: Date.now(),
    cancelled: false,
  };
}

function secondsSince(startedAt: number): number {
  return (Date.now() - startedAt) / 1000;
}

function noopSubscribe() {
  return () => {};
}
