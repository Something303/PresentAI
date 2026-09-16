'use client';

import { useRef, useCallback } from 'react';

interface UseAudioRecorderReturn {
  /** Begin recording raw audio from the given stream (call with the mic's MediaStream). */
  startRecording: (stream: MediaStream) => void;
  /** Stop recording and resolve with the captured audio as a single Blob (null if nothing was captured). */
  stopRecording: () => Promise<Blob | null>;
  /** Abort recording without producing a blob (used on unmount / hard reset). */
  cancelRecording: () => void;
  /** Pause capture (e.g. while the presenter hits "Jeda") — no audio is captured while paused. */
  pauseRecording: () => void;
  /** Resume capture after pauseRecording(). */
  resumeRecording: () => void;
}

// Prefer an Opus-in-WebM container (small size, broad Chromium/Firefox support); fall back
// progressively for browsers (e.g. Safari) that don't support it.
const CANDIDATE_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Captures raw microphone audio for server-side (Whisper) transcription.
 *
 * This exists alongside — not instead of — the browser's live Web Speech API captions:
 * that API auto-cleans disfluencies ("um", "eee") before returning text, so it can never be
 * used to detect filler words. Recording the raw audio lets us send it to a verbatim
 * speech-to-text model after the fact.
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm');

  const startRecording = useCallback((stream: MediaStream) => {
    if (typeof MediaRecorder === 'undefined' || !stream) return;

    // Defensive cleanup in case a previous recorder is still active (e.g. "repeat presentation").
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    chunksRef.current = [];

    const mimeType = pickSupportedMimeType();
    mimeTypeRef.current = mimeType || 'audio/webm';

    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000); // flush chunks every ~1s so we always have data even on abrupt stop
      recorderRef.current = recorder;
    } catch (err) {
      console.warn('MediaRecorder failed to start — falling back to browser captions only:', err);
      recorderRef.current = null;
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      const finalize = () => {
        const blob = chunksRef.current.length > 0
          ? new Blob(chunksRef.current, { type: mimeTypeRef.current })
          : null;
        chunksRef.current = [];
        resolve(blob);
      };

      if (!recorder || recorder.state === 'inactive') {
        finalize();
        return;
      }

      recorder.onstop = finalize;
      try {
        recorder.stop();
      } catch {
        finalize();
      }
    });
  }, []);

  const cancelRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    chunksRef.current = [];
    recorderRef.current = null;
  }, []);

  // Uses MediaRecorder's native pause/resume — while paused, ondataavailable simply doesn't
  // fire, so audio spoken during a "Jeda" (pause) never enters the captured blob at all,
  // keeping the recording's timeline consistent with the on-screen timer (which also stops).
  const pauseRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.pause();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'paused') {
      try {
        recorder.resume();
      } catch {
        /* ignore */
      }
    }
  }, []);

  return { startRecording, stopRecording, cancelRecording, pauseRecording, resumeRecording };
}
