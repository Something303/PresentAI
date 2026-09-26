'use client';

import Pitchfinder from 'pitchfinder';

export interface IntonationResult {
  score: number;
  pitchStdDevHz: number;
  meanPitchHz: number;
  voicedFrameCount: number;
}

const FRAME_SIZE = 2048;
const HOP_SIZE = 1024;
// Typical adult speaking-voice fundamental frequency range — filters out unvoiced/noise
// frames the pitch detector would otherwise report as spuriously very low or very high.
const MIN_VOICE_HZ = 70;
const MAX_VOICE_HZ = 400;
const MIN_VOICED_FRAMES = 10;

// Real prosody analysis from the raw recorded audio, replacing the old proxy (which just
// scored "intonation" from how many words were spoken — it never looked at the voice itself).
// Runs pitch detection (YIN) over overlapping frames and scores based on how much the pitch
// varies: a flat/monotone delivery stays within a narrow Hz band, while natural, expressive
// speech swings more. The Hz thresholds below are a first pass, not empirically calibrated —
// expect to retune them after testing against real recordings.
export async function analyzeIntonation(blob: Blob | null | undefined): Promise<IntonationResult | null> {
  if (typeof window === 'undefined' || !blob || blob.size === 0) return null;

  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  const audioContext = new AudioContextCtor();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const samples = audioBuffer.getChannelData(0);

    const detectPitch = Pitchfinder.YIN({ sampleRate: audioBuffer.sampleRate });
    const pitches: number[] = [];

    for (let i = 0; i + FRAME_SIZE <= samples.length; i += HOP_SIZE) {
      const frame = samples.subarray(i, i + FRAME_SIZE);
      const freq = detectPitch(frame);
      if (freq && freq >= MIN_VOICE_HZ && freq <= MAX_VOICE_HZ) {
        pitches.push(freq);
      }
    }

    if (pitches.length < MIN_VOICED_FRAMES) return null;

    const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.reduce((sum, f) => sum + (f - mean) ** 2, 0) / pitches.length;
    const stdDev = Math.sqrt(variance);

    let score: number;
    if (stdDev < 6) {
      score = 30 + stdDev * 2; // near-monotone
    } else if (stdDev < 15) {
      score = 42 + (stdDev - 6) * 3; // some variation
    } else if (stdDev < 40) {
      score = 69 + (stdDev - 15) * 0.9; // healthy expressive range
    } else {
      score = Math.max(70, 91 - (stdDev - 40) * 0.3); // too erratic — ease back down
    }

    return {
      score: Math.round(Math.min(96, Math.max(20, score))),
      pitchStdDevHz: Math.round(stdDev * 10) / 10,
      meanPitchHz: Math.round(mean),
      voicedFrameCount: pitches.length,
    };
  } catch (err) {
    console.warn('Intonation analysis failed:', err);
    return null;
  } finally {
    audioContext.close().catch(() => {});
  }
}
