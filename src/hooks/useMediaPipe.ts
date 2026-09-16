'use client';

import { useState, useEffect, useRef } from 'react';
import type { MediaPipeResult, Language } from '@/types';
import type { Results, NormalizedLandmark, NormalizedLandmarkList } from '@mediapipe/holistic';

interface UseMediaPipeProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  enabled?: boolean;
  language?: Language;
}

// BlazePose (33-landmark) indices we rely on.
const NOSE = 0;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_EAR = 7;
const RIGHT_EAR = 8;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

// Upper-body skeleton for the HUD overlay.
const UPPER_POSE_CONNECTIONS: Array<[number, number]> = [
  [LEFT_SHOULDER, RIGHT_SHOULDER],
  [LEFT_SHOULDER, LEFT_ELBOW],
  [LEFT_ELBOW, LEFT_WRIST],
  [RIGHT_SHOULDER, RIGHT_ELBOW],
  [RIGHT_ELBOW, RIGHT_WRIST],
  [LEFT_SHOULDER, LEFT_HIP],
  [RIGHT_SHOULDER, RIGHT_HIP],
  [LEFT_HIP, RIGHT_HIP],
];

const SEND_INTERVAL_MS = 100; // throttle frame submission (~10 fps)
const jitter = (n: number) => Math.round(Math.random() * n);
const vis = (lm?: NormalizedLandmark) => lm?.visibility ?? 0;
const distance = (a: NormalizedLandmark, b: NormalizedLandmark) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export function useMediaPipe({
  videoRef,
  canvasRef,
  enabled = true,
  language = 'id',
}: UseMediaPipeProps) {
  const isIndo = language === 'id';

  const [metrics, setMetrics] = useState<MediaPipeResult>({
    eyeContactScore: 0,
    postureScore: 0,
    gestureScore: 0,
    expressionScore: 0,
    movementScore: 0,
    bodyLanguageScore: 0,
  });

  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [postureFeedback, setPostureFeedback] = useState<string>(
    isIndo ? 'Memuat model AI...' : 'Loading AI model...'
  );

  // Holistic + loop state
  const holisticRef = useRef<{ send: (i: { image: HTMLVideoElement }) => Promise<void>; close: () => Promise<void>; onResults: (cb: (r: Results) => void) => void; setOptions: (o: Record<string, unknown>) => void } | null>(null);
  const rafRef = useRef<number | null>(null);
  const sendingRef = useRef(false);
  const lastSendRef = useRef(0);
  const enabledRef = useRef(enabled);

  // Scoring state (persists across frames)
  const smoothedRef = useRef({ eye: 0, posture: 0, gesture: 0, expression: 0, movement: 0, body: 0 });
  const prevPoseRef = useRef<NormalizedLandmarkList | null>(null);
  const mouthHistRef = useRef<number[]>([]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    // ----------------------------------------------------------------
    // Scoring from real landmarks
    // ----------------------------------------------------------------
    const scoreEyeContact = (pose: NormalizedLandmarkList | undefined, face: NormalizedLandmarkList | undefined): number => {
      if (!pose) return face ? 55 : 0;
      const nose = pose[NOSE];
      const leftEar = pose[LEFT_EAR];
      const rightEar = pose[RIGHT_EAR];
      if (!nose || !leftEar || !rightEar) return face ? 55 : 30;

      const earSpan = Math.abs(leftEar.x - rightEar.x) || 0.01;
      const earMidX = (leftEar.x + rightEar.x) / 2;
      // How far the nose has swung toward one ear — grows as the head turns away.
      const noseOffset = Math.abs(nose.x - earMidX) / earSpan;
      const earVisSym = 1 - Math.abs(vis(leftEar) - vis(rightEar));
      const minEarVis = Math.min(vis(leftEar), vis(rightEar));
      // A visible face mesh means the head is roughly frontal (facing the lens).
      const facingCamera = !!face;

      if (facingCamera && minEarVis > 0.5 && noseOffset < 0.18 && earVisSym > 0.7) {
        return 88 + jitter(8); // looking straight into the camera
      }
      if (minEarVis > 0.35 && noseOffset < 0.35) {
        return 58 + jitter(12); // glancing slightly off-center
      }
      return 20 + jitter(15); // turned / looking away
    };

    const scorePosture = (pose: NormalizedLandmarkList | undefined): { score: number; feedback: string } => {
      if (!pose) return { score: 0, feedback: isIndo ? 'Tubuh tidak terdeteksi' : 'Body not detected' };
      const ls = pose[LEFT_SHOULDER];
      const rs = pose[RIGHT_SHOULDER];
      const nose = pose[NOSE];
      if (!ls || !rs || vis(ls) < 0.4 || vis(rs) < 0.4) {
        return { score: 45 + jitter(6), feedback: isIndo ? 'Posisikan bahu di dalam frame' : 'Position your shoulders in frame' };
      }

      const tilt = Math.abs(ls.y - rs.y);           // shoulder line slope
      const midX = (ls.x + rs.x) / 2;
      const offCenter = Math.abs(midX - 0.5);        // body off camera center
      const lean = nose ? Math.abs(nose.x - midX) : 0; // head not above shoulders

      if (offCenter > 0.22) return { score: 52 + jitter(6), feedback: isIndo ? 'Posisikan tubuh ke tengah' : 'Center your body' };
      if (tilt > 0.06) return { score: 60 + jitter(8), feedback: isIndo ? 'Sejajarkan & tegakkan bahu' : 'Align & straighten your shoulders' };
      if (lean > 0.13) return { score: 66 + jitter(6), feedback: isIndo ? 'Luruskan kepala dengan bahu' : 'Align your head with your shoulders' };
      return { score: 88 + jitter(6), feedback: isIndo ? 'Postur tegak & seimbang' : 'Upright & balanced posture' };
    };

    const scoreGesture = (
      pose: NormalizedLandmarkList | undefined,
      leftHand: NormalizedLandmarkList | undefined,
      rightHand: NormalizedLandmarkList | undefined,
    ): number => {
      const handsVisible = (leftHand ? 1 : 0) + (rightHand ? 1 : 0);
      const lw = pose?.[LEFT_WRIST];
      const rw = pose?.[RIGHT_WRIST];
      const hipY = Math.min(pose?.[LEFT_HIP]?.y ?? 1, pose?.[RIGHT_HIP]?.y ?? 1);
      const wristRaised =
        (lw && vis(lw) > 0.5 && lw.y < hipY) || (rw && vis(rw) > 0.5 && rw.y < hipY);

      if (handsVisible >= 1 && wristRaised) return 84 + jitter(9); // actively gesturing in view
      if (handsVisible >= 1) return 70 + jitter(7);                // hands present but low
      if (wristRaised) return 72 + jitter(6);
      return 56 + jitter(8);                                       // hands down / out of view
    };

    const scoreMovement = (pose: NormalizedLandmarkList | undefined, prev: NormalizedLandmarkList | null): number => {
      if (!pose || !prev) return 68;
      const pts = [NOSE, LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_WRIST, RIGHT_WRIST];
      let sum = 0;
      let n = 0;
      for (const i of pts) {
        if (pose[i] && prev[i]) {
          sum += distance(pose[i], prev[i]);
          n++;
        }
      }
      const avg = n ? sum / n : 0; // normalized displacement per ~100ms
      if (avg < 0.004) return 55 + jitter(6);   // frozen / statue-like
      if (avg <= 0.05) return 84 + jitter(6);   // natural presentation movement
      if (avg > 0.12) return 58 + jitter(6);    // restless / erratic
      return 74 + jitter(6);
    };

    const scoreExpression = (face: NormalizedLandmarkList | undefined): number => {
      if (!face || face.length < 468) return 0;
      // Mouth openness (inner lips 13/14) normalized by face height (forehead 10 → chin 152).
      const faceH = distance(face[10], face[152]) || 0.2;
      const openRatio = distance(face[13], face[14]) / faceH;
      const hist = mouthHistRef.current;
      hist.push(openRatio);
      if (hist.length > 20) hist.shift();
      const mean = hist.reduce((a, b) => a + b, 0) / hist.length;
      const variance = hist.reduce((s, v) => s + (v - mean) ** 2, 0) / hist.length;
      const activity = Math.sqrt(variance); // how animated the mouth is while speaking
      if (activity > 0.012) return 86 + jitter(6);
      if (activity > 0.005) return 78 + jitter(6);
      return 66 + jitter(6); // face present but static/expressionless
    };

    // ----------------------------------------------------------------
    // HUD overlay
    // ----------------------------------------------------------------
    const drawHud = (results: Results) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (canvas.width !== (video.videoWidth || 640) || canvas.height !== (video.videoHeight || 480)) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const pose = results.poseLandmarks;
      if (pose) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
        ctx.lineWidth = 3;
        for (const [a, b] of UPPER_POSE_CONNECTIONS) {
          if (pose[a] && pose[b] && vis(pose[a]) > 0.3 && vis(pose[b]) > 0.3) {
            ctx.beginPath();
            ctx.moveTo(pose[a].x * w, pose[a].y * h);
            ctx.lineTo(pose[b].x * w, pose[b].y * h);
            ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
        for (const i of [NOSE, LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_ELBOW, RIGHT_ELBOW, LEFT_WRIST, RIGHT_WRIST]) {
          if (pose[i] && vis(pose[i]) > 0.3) {
            ctx.beginPath();
            ctx.arc(pose[i].x * w, pose[i].y * h, 4, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }

      // Face mesh (subsampled) + hands as light dots
      ctx.fillStyle = 'rgba(16, 185, 129, 0.55)';
      const face = results.faceLandmarks;
      if (face) {
        for (let i = 0; i < face.length; i += 8) {
          ctx.beginPath();
          ctx.arc(face[i].x * w, face[i].y * h, 1.3, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(244, 114, 182, 0.85)';
      for (const hand of [results.leftHandLandmarks, results.rightHandLandmarks]) {
        if (hand) {
          for (const p of hand) {
            ctx.beginPath();
            ctx.arc(p.x * w, p.y * h, 2.5, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    };

    // ----------------------------------------------------------------
    // Results handler
    // ----------------------------------------------------------------
    const onResults = (results: Results) => {
      const pose = results.poseLandmarks;
      const face = results.faceLandmarks;
      // A real person is present only when MediaPipe actually detects a body/face —
      // static backgrounds (walls, furniture) are never detected, so leaving the frame
      // now correctly drives every score toward 0.
      const hasPresenter = !!(pose && pose.length) || !!(face && face.length);
      setIsFaceDetected(hasPresenter);

      let eye = 0, post = 0, gest = 0, expr = 0, mov = 0;
      let feedback = isIndo ? 'Presenter tidak terdeteksi di frame' : 'Presenter not detected in frame';

      if (hasPresenter) {
        eye = scoreEyeContact(pose, face);
        const p = scorePosture(pose);
        post = p.score;
        feedback = p.feedback;
        gest = scoreGesture(pose, results.leftHandLandmarks, results.rightHandLandmarks);
        mov = scoreMovement(pose, prevPoseRef.current);
        expr = scoreExpression(face);
        prevPoseRef.current = pose ?? null;
      } else {
        prevPoseRef.current = null;
        mouthHistRef.current = [];
      }
      setPostureFeedback(feedback);

      // Exponential smoothing; fast decay to 0 when no presenter is detected.
      const prev = smoothedRef.current;
      const alpha = !hasPresenter ? 0.9 : 0.3;
      const blend = (p: number, target: number) =>
        !hasPresenter
          ? Math.max(0, Math.round(p * (1 - alpha)))
          : Math.max(0, Math.round(p * (1 - alpha) + target * alpha));

      const E = blend(prev.eye, eye);
      const P = blend(prev.posture, post);
      const G = blend(prev.gesture, gest);
      const X = blend(prev.expression, expr);
      const M = blend(prev.movement, mov);
      const body = Math.round(E * 0.4 + P * 0.35 + G * 0.25);

      smoothedRef.current = { eye: E, posture: P, gesture: G, expression: X, movement: M, body };
      setMetrics({
        eyeContactScore: E,
        postureScore: P,
        gestureScore: G,
        expressionScore: X,
        movementScore: M,
        bodyLanguageScore: body,
      });

      drawHud(results);
    };

    // ----------------------------------------------------------------
    // Initialize Holistic (client-only, assets served from /public)
    // ----------------------------------------------------------------
    const init = async () => {
      try {
        const mod = await import('@mediapipe/holistic');
        const HolisticCtor =
          (mod as { Holistic?: new (c: object) => unknown }).Holistic ??
          (mod as { default?: { Holistic?: new (c: object) => unknown } }).default?.Holistic;
        if (!HolisticCtor || cancelled) return;

        const holistic = new HolisticCtor({
          locateFile: (file: string) => `/mediapipe/holistic/${file}`,
        }) as NonNullable<typeof holisticRef.current>;

        holistic.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          refineFaceLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
          selfieMode: false,
        });
        holistic.onResults(onResults);
        holisticRef.current = holistic;
        setPostureFeedback(isIndo ? 'Mendeteksi presenter...' : 'Detecting presenter...');

        const pump = async () => {
          const video = videoRef.current;
          if (video && video.readyState >= 2 && holisticRef.current && !sendingRef.current) {
            const now = performance.now();
            if (now - lastSendRef.current >= SEND_INTERVAL_MS) {
              lastSendRef.current = now;
              sendingRef.current = true;
              try {
                await holisticRef.current.send({ image: video });
              } catch {
                /* transient send error — ignore and continue */
              }
              sendingRef.current = false;
            }
          }
          if (enabledRef.current && !cancelled) {
            rafRef.current = requestAnimationFrame(pump);
          }
        };
        rafRef.current = requestAnimationFrame(pump);
      } catch (err) {
        console.error('Failed to initialize MediaPipe Holistic:', err);
        setPostureFeedback(isIndo ? 'Gagal memuat model AI' : 'Failed to load AI model');
      }
    };

    init();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      const h = holisticRef.current;
      holisticRef.current = null;
      prevPoseRef.current = null;
      mouthHistRef.current = [];
      if (h) {
        h.close().catch(() => { /* ignore */ });
      }
    };
  }, [enabled, videoRef, canvasRef, isIndo]);

  return {
    metrics,
    isFaceDetected,
    postureFeedback,
  };
}
