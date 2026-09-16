'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Play,
  Pause,
  Square,
  Clock,
  Mic,
  Eye,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  MessageSquare,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCamera } from '@/hooks/useCamera';
import { useMicrophone } from '@/hooks/useMicrophone';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import type { TranscribeAudioResponse } from '@/app/api/transcribe-audio/route';
import { CameraPreview } from '@/components/presentation/CameraPreview';
import { SlideViewer } from '@/components/presentation/SlideViewer';
import { QASection } from '@/components/presentation/QASection';
import { MicIndicator } from '@/components/presentation/MicIndicator';
import {
  getStoredPresentations,
  storeSession,
  getMockAnalysis
} from '@/lib/mock/data';
import {
  getPresentationById,
  getPresentationAnalysis,
  createPracticeSession,
  saveAiFeedback,
} from '@/lib/supabase/data';
import { calculateOverallScore, isDemoMode } from '@/lib/config';
import { getMaterial } from '@/lib/material-storage';
import { getExaminerLabel } from '@/lib/utils';
import type {
  Presentation,
  MediaPipeResult,
  QASession,
  PracticeSession,
  PresentationAnalysis
} from '@/types';

export default function PresentationRoomPage() {
  const router = useRouter();
  const params = useParams();
  const presentationId = (params?.id as string) || 'pres-001';
  const { t, language } = useLanguage();

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [materialText, setMaterialText] = useState('');
  const [slideImages, setSlideImages] = useState<string[][]>([]);
  const [fileData, setFileData] = useState('');
  const [slideCount, setSlideCount] = useState(6);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Countdown = total duration in seconds, counts down to 0
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [stage, setStage] = useState<'prep' | 'presenting' | 'qa' | 'processing'>('prep');
  const [questions, setQuestions] = useState<string[]>([]);
  const [storedAnalysis, setStoredAnalysis] = useState<PresentationAnalysis | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<MediaPipeResult>({
    eyeContactScore: 0,
    postureScore: 0,
    gestureScore: 0,
    expressionScore: 0,
    movementScore: 0,
    bodyLanguageScore: 0,
  });

  // Cumulative session tracker for MediaPipe metrics over the entire presentation
  const bodyLanguageTrackerRef = useRef<{
    samplesCount: number;
    sumEyeContact: number;
    sumPosture: number;
    sumGesture: number;
    sumExpression: number;
    sumMovement: number;
    sumBodyLanguage: number;
  }>({
    samplesCount: 0,
    sumEyeContact: 0,
    sumPosture: 0,
    sumGesture: 0,
    sumExpression: 0,
    sumMovement: 0,
    sumBodyLanguage: 0,
  });

  const handleMetricsUpdate = useCallback((metrics: MediaPipeResult) => {
    setLiveMetrics(metrics);
    // Only accumulate while actively presenting — pause sampling while the time-up modal
    // is open, since the presenter is looking at the dialog, not presenting.
    if (stage === 'presenting' && isRecording && !isPaused && !showTimeUpModal) {
      const tracker = bodyLanguageTrackerRef.current;
      tracker.samplesCount += 1;
      tracker.sumEyeContact += metrics.eyeContactScore;
      tracker.sumPosture += metrics.postureScore;
      tracker.sumGesture += metrics.gestureScore;
      tracker.sumExpression += metrics.expressionScore;
      tracker.sumMovement += metrics.movementScore;
      tracker.sumBodyLanguage += metrics.bodyLanguageScore;
    }
  }, [stage, isRecording, isPaused, showTimeUpModal]);

  // Camera, Mic & Speech Hooks
  const camera = useCamera();
  const mic = useMicrophone();
  const stt = useSpeechToText({ language }); // live captions only — auto-cleans filler words
  const audioRecorder = useAudioRecorder();  // raw audio → verbatim Whisper transcript for scoring

  // Verbatim transcript from Whisper (set once Q&A begins). Falls back to the browser's
  // live-caption transcript (stt.transcript) when unavailable (no API key, or transcription failed).
  const verbatimTranscriptRef = useRef<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // True whenever we WANT audio recording to be running but haven't managed to start it yet
  // (set by handleStartPresentation/handleRepeatPresentation). Consumed by the effect below.
  const recordingArmedRef = useRef(false);

  // Starts the raw-audio recording as soon as BOTH "we intend to record" and "the mic stream
  // is actually ready" are true. This exists because mic.stream initializes asynchronously
  // (getUserMedia) — clicking "Mulai Presentasi" the instant the page loads could otherwise
  // race ahead of the microphone being ready, silently skipping recording (and later, the
  // whole verbatim-transcription step) with no error. Firing from an effect keyed on
  // mic.stream means it retries automatically the moment the stream becomes available.
  useEffect(() => {
    if (recordingArmedRef.current && stage === 'presenting' && isRecording && mic.stream) {
      audioRecorder.startRecording(mic.stream);
      recordingArmedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, isRecording, mic.stream]);

  // Load Presentation Data
  useEffect(() => {
    // Real accounts load from Supabase (RLS-scoped to this user) instead of the shared
    // browser localStorage — otherwise every account on the same browser would load
    // whichever presentation/analysis happened to be cached there.
    const loadPresentationAndAnalysis = async () => {
      const found = isDemoMode
        ? getStoredPresentations().find((p) => p.id === presentationId) ?? null
        : await getPresentationById(presentationId);
      if (found) {
        setPresentation(found);
      }

      if (isDemoMode) {
        if (typeof window !== 'undefined') {
          try {
            const savedAnalysis = localStorage.getItem(`presentai_analysis_${presentationId}`);
            setStoredAnalysis(savedAnalysis ? JSON.parse(savedAnalysis) : getMockAnalysis(presentationId));
          } catch {
            setStoredAnalysis(getMockAnalysis(presentationId));
          }
        } else {
          setStoredAnalysis(getMockAnalysis(presentationId));
        }
      } else {
        const analysis = await getPresentationAnalysis(presentationId);
        setStoredAnalysis(analysis ?? getMockAnalysis(presentationId));
      }
    };
    loadPresentationAndAnalysis();

    getMaterial(`presentai-material-${presentationId}`).then((material) => {
      if (material) {
        setMaterialText(material.fileContent ?? '');
        setSlideImages(material.slideImages ?? []);
        setFileData(material.fileData ?? '');
        setSlideCount(material.slideCount ?? 6);

        // Derive presentation info if not loaded or if still has mock default title
        const cleanName = material.fileName ? material.fileName.replace(/\.[^/.]+$/, '') : '';
        setPresentation((prev) => {
          if (!prev) {
            return {
              id: presentationId,
              user_id: 'demo',
              title: cleanName || 'Presentasi',
              description: '',
              file_url: '',
              file_name: material.fileName,
              language: 'id',
              duration: 15,
              examiner: 'general_audience',
              difficulty: 'medium',
              created_at: new Date().toISOString(),
            };
          }
          if (cleanName && (!prev.title || prev.title === 'Artificial Intelligence in Education')) {
            return { ...prev, title: cleanName };
          }
          return prev;
        });
      } else {
        const legacyMaterial = sessionStorage.getItem(`presentai-material-${presentationId}`);
        if (legacyMaterial) {
          try {
            const parsed = JSON.parse(legacyMaterial) as {
              fileContent?: string;
              slideImages?: string[][];
              fileData?: string;
              slideCount?: number;
              fileName?: string;
            };
            setMaterialText(parsed.fileContent ?? '');
            setSlideImages(parsed.slideImages ?? []);
            setFileData(parsed.fileData ?? '');
            setSlideCount(parsed.slideCount ?? 6);
            if (parsed.fileName) {
              const clean = parsed.fileName.replace(/\.[^/.]+$/, '');
              setPresentation((prev) => prev ? { ...prev, title: clean } : null);
            }
            return;
          } catch {
            // Use empty material below when the legacy value is invalid.
          }
        }
        setMaterialText('');
        setSlideImages([]);
        setFileData('');
        setSlideCount(6);
      }
    }).catch(() => {
      setMaterialText('');
      setSlideImages([]);
      setFileData('');
      setSlideCount(6);
    });
  }, [presentationId]);

  // Guards the time-up modal so it fires exactly once per countdown (the timer keeps
  // ticking at 0, which would otherwise re-open the modal every second).
  const timeUpHandledRef = useRef(false);

  // Timer logic — drives both elapsedSeconds (for scoring) and countdownSeconds
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused && stage === 'presenting') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
        setCountdownSeconds((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            // Time is up — show the modal ONCE (don't auto-stop, don't re-open each tick)
            if (!timeUpHandledRef.current) {
              timeUpHandledRef.current = true;
              setShowTimeUpModal(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused, stage]);

  // Start Hardware on Page Mount
  useEffect(() => {
    camera.startCamera();
    mic.startMicrophone();

    return () => {
      camera.stopCamera();
      mic.stopMicrophone();
      stt.stopListening();
      audioRecorder.cancelRecording();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Presentation Session
  const handleStartPresentation = () => {
    const durationMinutes = presentation?.duration ?? 15;
    const totalSecs = durationMinutes * 60;
    timeUpHandledRef.current = false;
    setCountdownSeconds(totalSecs);
    setElapsedSeconds(0);
    setIsRecording(true);
    setIsPaused(false);
    setStage('presenting');
    stt.startListening();
    verbatimTranscriptRef.current = '';
    // Arm audio recording — the effect above starts it immediately if mic.stream is already
    // ready, or as soon as it becomes ready if the mic was still initializing at this click.
    recordingArmedRef.current = true;
  };

  // Repeat presentation (reset everything)
  const handleRepeatPresentation = () => {
    const durationMinutes = presentation?.duration ?? 15;
    // Re-arm the timer synchronously so a pending tick can't re-open the modal (race fix).
    timeUpHandledRef.current = false;
    setShowTimeUpModal(false);
    setCountdownSeconds(durationMinutes * 60);
    setElapsedSeconds(0);
    setCurrentSlide(1);
    setIsRecording(true);
    setIsPaused(false);
    setStage('presenting');
    // Reset body language accumulator
    bodyLanguageTrackerRef.current = {
      samplesCount: 0, sumEyeContact: 0, sumPosture: 0,
      sumGesture: 0, sumExpression: 0, sumMovement: 0, sumBodyLanguage: 0,
    };
    // Restart speech recognition cleanly (stop → start needs a brief gap).
    stt.stopListening();
    stt.resetTranscript();
    setTimeout(() => stt.startListening(), 200);

    // Discard the previous take's audio and arm a fresh verbatim recording (see the
    // mic-readiness effect above — same race-safe start-on-ready mechanism).
    audioRecorder.cancelRecording();
    verbatimTranscriptRef.current = '';
    recordingArmedRef.current = true;
  };

  // Pause / Resume Presentation
  const handleTogglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      stt.startListening();
      audioRecorder.resumeRecording();
    } else {
      setIsPaused(true);
      stt.stopListening();
      audioRecorder.pauseRecording();
    }
  };

  // Transition to Q&A
  const handleProceedToQA = async () => {
    setIsRecording(false);
    stt.stopListening();
    setStage('processing');
    setIsTranscribing(true);

    // Stop the raw-audio recording and kick off verbatim (Whisper) transcription in parallel
    // with question generation below — both are awaited together before entering Q&A, so the
    // final scoring step always has the accurate, filler-word-preserving transcript ready.
    const transcriptionPromise = audioRecorder.stopRecording().then(async (blob) => {
      if (!blob || blob.size === 0) {
        console.warn('[Room] No audio captured for this presentation — falling back to live-caption transcript. (Was the mic ready when "Mulai Presentasi" was clicked?)');
        return;
      }
      try {
        const form = new FormData();
        form.append('audio', blob, 'recording.webm');
        form.append('language', language);
        const res = await fetch('/api/transcribe-audio', { method: 'POST', body: form });
        const data = (await res.json()) as TranscribeAudioResponse;
        if (data.transcript) verbatimTranscriptRef.current = data.transcript;
      } catch (err) {
        console.warn('Verbatim transcription failed — falling back to live captions:', err);
      }
    });

    // Hitung target jumlah pertanyaan (kustom atau otomatis cerdas)
    let targetCount = 3;
    if (presentation?.question_count_mode === 'custom' && presentation.custom_question_count) {
      targetCount = Math.max(1, Math.min(10, presentation.custom_question_count));
    } else {
      // Otomatis proporsional berdasarkan jumlah slide dan durasi
      const totalSlides = slideCount || 6;
      const durationMinutes = presentation?.duration || 15;
      if (totalSlides <= 4 || durationMinutes <= 5) {
        targetCount = 2;
      } else if (totalSlides <= 8 || durationMinutes <= 15) {
        targetCount = 3;
      } else if (totalSlides <= 14 || durationMinutes <= 25) {
        targetCount = 4;
      } else {
        targetCount = 5;
      }
    }

    const presTitle = presentation?.title || 'Presentasi';
    const rawContent = materialText ? materialText.slice(0, 3000).trim() : '';
    const analysisSummary = storedAnalysis?.summary || '';

    const combinedSummary = rawContent
      ? `Judul: "${presTitle}"\nIsi Materi Presentasi:\n${rawContent}`
      : analysisSummary
        ? `Judul: "${presTitle}"\nRingkasan Materi:\n${analysisSummary}`
        : `Judul: "${presTitle}"${presentation?.description ? `\nDeskripsi: ${presentation.description}` : ''}`;

    const extractedKeyPoints = (storedAnalysis?.key_points && storedAnalysis.key_points.length > 0)
      ? storedAnalysis.key_points
      : rawContent
        ? rawContent.split('\n').map((s) => s.trim()).filter((s) => s.length > 10 && s.length < 120).slice(0, 4)
        : [`Konsep dan latar belakang ${presTitle}`, `Implementasi dan keunggulan ${presTitle}`, `Dampak dan kesimpulan ${presTitle}`];

    const topicLabel = presTitle ? `materi "${presTitle}"` : 'materi presentasi Anda';
    const fallbackPool = language === 'id' ? [
      `Bagaimana Anda memvalidasi keakuratan data, metodologi, dan argumen utama dalam ${topicLabel}?`,
      `Jika konsep dalam ${topicLabel} ini diterapkan pada skala yang lebih besar, kendala apa yang paling kritis?`,
      `Apa keunggulan pendekatan dalam ${topicLabel} dibandingkan metode atau produk yang sudah ada sebelumnya?`,
      `Bagaimana Anda mengukur efektivitas dan keberhasilan dari implementasi ${topicLabel} ini?`,
      `Bisa jelaskan kembali kesimpulan paling esensial yang ingin Anda sampaikan mengenai ${topicLabel}?`,
      `Tantangan terbesar apa yang Anda hadapi saat menyusun argumen dalam ${topicLabel}?`,
      `Bagian mana dari ${topicLabel} yang menurut Anda membutuhkan pembuktian atau data tambahan?`,
      `Bagaimana strategi Anda jika audiens atau pengguna meragukan klaim utama dalam ${topicLabel} ini?`,
      `Langkah praktis apa yang paling mendesak dilakukan setelah menyelesaikan presentasi ${topicLabel} ini?`,
      `Apa pesan terpenting yang ingin Anda pastikan diingat oleh audiens dari ${topicLabel}?`,
    ] : [
      `How do you validate the accuracy of data, methodology, and core claims in ${presTitle || 'your presentation'}?`,
      `If the concepts in ${presTitle || 'this project'} are scaled up, what obstacles would be most critical?`,
      `What is the distinct competitive advantage of your approach in ${presTitle || 'this project'} compared to existing alternatives?`,
      `How do you measure the practical success and impact of ${presTitle || 'this implementation'}?`,
      `Could you clarify the single most critical takeaway from your presentation on ${presTitle || 'this topic'}?`,
      `What was the most challenging obstacle when preparing the arguments for ${presTitle || 'this presentation'}?`,
      `Which aspect of ${presTitle || 'this project'} requires further validation or supplementary data?`,
      `How would you address skepticism from stakeholders regarding the core claims of ${presTitle || 'this project'}?`,
      `What immediate practical steps should be taken following ${presTitle || 'this presentation'}?`,
      `What key insight must the audience remember about ${presTitle || 'this proposal'}?`,
    ];

    try {
      // Fetch or generate questions based on actual material & examiner
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentation_title: presTitle,
          material_summary: combinedSummary,
          key_points: extractedKeyPoints.length > 0 ? extractedKeyPoints : [`Topik utama: ${presTitle}`],
          difficulty: presentation?.difficulty || 'medium',
          examiner: presentation?.examiner || 'general_audience',
          language,
          question_count: targetCount,
        }),
      });
      const data = await res.json();
      const generated = Array.isArray(data.questions) && data.questions.length > 0
        ? data.questions.slice(0, targetCount)
        : null;

      setQuestions(generated || fallbackPool.slice(0, targetCount));
    } catch {
      setQuestions(fallbackPool.slice(0, targetCount));
    } finally {
      // Ensure the verbatim transcript has landed (or definitively failed) before scoring.
      await transcriptionPromise;
      setIsTranscribing(false);
      setStage('qa');
    }
  };

  // Complete Q&A and Save Final Session
  const handleFinishSession = async (qaResults: QASession[]) => {
    setStage('processing');

    // Run speech analysis API
    // Prefer the verbatim Whisper transcript (preserves filler words like "eee"/"umm"/"anu")
    // over the browser's live-caption transcript, which auto-cleans disfluencies away.
    // Empty string = silence = will get penalized by API.
    const actualTranscript = (verbatimTranscriptRef.current || stt.transcript)?.trim() || '';
    let speechScore = actualTranscript ? 82 : 8;   // sensible default based on presence of speech
    let intonationScore = actualTranscript ? 80 : 5;
    let wpm = actualTranscript ? 130 : 0;
    let fillerCount = 0;

    try {
      const speechRes = await fetch('/api/analyze-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: actualTranscript,   // empty = silence, API handles it correctly
          duration: Math.max(30, elapsedSeconds),
          language,
        }),
      });
      const speechData = await speechRes.json();
      speechScore = speechData.speech_score ?? (actualTranscript ? 82 : 8);
      intonationScore = speechData.intonation_score ?? (actualTranscript ? 80 : 5);
      wpm = speechData.words_per_minute ?? (actualTranscript ? 130 : 0);
      fillerCount = speechData.filler_words ?? 0;
    } catch (err) {
      console.warn('Fallback to local speech score', err);
    }

    // Run content analysis API to get accurate content & structure scores
    let contentScore = actualTranscript ? 80 : 5;
    let structureScore = actualTranscript ? 80 : 5;

    try {
      const analysisKeyPoints = storedAnalysis?.key_points ?? [];
      const materialSummary =
        storedAnalysis?.summary ||
        presentation?.description ||
        (language === 'id' ? 'AI dalam pendidikan modern' : 'AI in modern education');

      const contentRes = await fetch('/api/analyze-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_summary: materialSummary,
          key_points: analysisKeyPoints,
          transcript: actualTranscript,   // send real (possibly empty) transcript
          language,
        }),
      });
      const contentData = await contentRes.json();
      contentScore = contentData.content_score ?? (actualTranscript ? 80 : 5);
      structureScore = contentData.structure_score ?? (actualTranscript ? 80 : 5);
    } catch (err) {
      console.warn('Fallback to local content score', err);
      // If speech existed, derive from speech quality; if silent, keep very low
      if (actualTranscript) {
        contentScore = Math.min(95, Math.max(40, speechScore + Math.round((Math.random() - 0.5) * 10)));
        structureScore = Math.min(95, Math.max(40, speechScore + Math.round((Math.random() - 0.5) * 12)));
      }
    }

    // Calculate QA Average Score from actual Q&A performance
    const qaScores = qaResults.map((q) => q.score ?? 80);
    const qaScore = qaScores.length > 0
      ? Math.round(qaScores.reduce((a, b) => a + b, 0) / qaScores.length)
      : 80;

    // Body language scores: calculate true accumulated average over the session
    const tracker = bodyLanguageTrackerRef.current;
    const samples = tracker.samplesCount;
    const finalEyeContact = samples > 0 ? Math.round(tracker.sumEyeContact / samples) : liveMetrics.eyeContactScore;
    const finalPosture = samples > 0 ? Math.round(tracker.sumPosture / samples) : liveMetrics.postureScore;
    const finalGesture = samples > 0 ? Math.round(tracker.sumGesture / samples) : liveMetrics.gestureScore;
    const finalBodyLanguage = samples > 0 ? Math.round(tracker.sumBodyLanguage / samples) : liveMetrics.bodyLanguageScore;

    const finalLiveMetrics: MediaPipeResult = {
      eyeContactScore: finalEyeContact,
      postureScore: finalPosture,
      gestureScore: finalGesture,
      expressionScore: samples > 0 ? Math.round(tracker.sumExpression / samples) : liveMetrics.expressionScore,
      movementScore: samples > 0 ? Math.round(tracker.sumMovement / samples) : liveMetrics.movementScore,
      bodyLanguageScore: finalBodyLanguage,
    };

    const overallScore = calculateOverallScore({
      content: contentScore,
      speech: speechScore,
      intonation: intonationScore,
      bodyLanguage: finalBodyLanguage,
      structure: structureScore,
      qa: qaScore,
    });

    const transcriptText = actualTranscript || (language === 'id' ? '[Tidak ada transkrip — presenter tidak terdeteksi berbicara]' : '[No transcript — presenter did not speak]');
    const sessionDuration = Math.max(25, elapsedSeconds);
    let sessionId: string;

    if (isDemoMode) {
      // Demo mode has no real Supabase account — keep the original localStorage flow.
      sessionId = `session-${Date.now()}`;
      const newSession: PracticeSession = {
        id: sessionId,
        presentation_id: presentationId,
        user_id: 'demo-user-001',
        duration: sessionDuration,
        transcript: transcriptText,
        overall_score: overallScore,
        content_score: contentScore,
        speech_score: speechScore,
        intonation_score: intonationScore,
        body_language_score: finalBodyLanguage,
        structure_score: structureScore,
        qa_score: qaScore,
        created_at: new Date().toISOString(),
        presentation: presentation || undefined,
      };
      storeSession(newSession);
    } else {
      // Real account: persist to Supabase (RLS-scoped to this user), including the Q&A
      // answers — this is the fix for practice history leaking between different accounts
      // on the same browser, since it no longer touches shared localStorage at all.
      try {
        const created = await createPracticeSession(
          {
            presentation_id: presentationId,
            duration: sessionDuration,
            transcript: transcriptText,
            overall_score: overallScore,
            content_score: contentScore,
            speech_score: speechScore,
            intonation_score: intonationScore,
            body_language_score: finalBodyLanguage,
            structure_score: structureScore,
            qa_score: qaScore,
          },
          qaResults.map((qa, idx) => ({
            question: qa.question,
            answer: qa.answer,
            score: qa.score,
            feedback: qa.feedback,
            order_index: qa.order_index ?? idx,
          }))
        );
        sessionId = created.id;
      } catch (err) {
        console.error('Failed to save practice session to Supabase:', err);
        // Fall back to a local-only id so the user still reaches a result page instead of
        // a dead end — this session just won't show up later in History/Progress.
        sessionId = `session-${Date.now()}`;
      }
    }

    // Save session detail to sessionStorage for result page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`session-details-${sessionId}`, JSON.stringify({
        wpm,
        fillerCount,
        liveMetrics: finalLiveMetrics,
        qaResults,
      }));
    }

    // Trigger AI Feedback Generation in background or prefetch
    try {
      const fbRes = await fetch('/api/generate-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentation_title: presentation?.title || 'Presentasi',
          material_summary: materialText ? materialText.slice(0, 1500) : (storedAnalysis?.summary || ''),
          transcript: actualTranscript,
          scores: {
            overall: overallScore,
            content: contentScore,
            speech: speechScore,
            intonation: intonationScore,
            body_language: finalBodyLanguage,
            structure: structureScore,
            qa: qaScore,
          },
          speech_data: {
            words_per_minute: wpm,
            filler_words: fillerCount,
          },
          body_data: {
            eye_contact_score: finalEyeContact,
            posture_score: finalPosture,
            gesture_score: finalGesture,
          },
          qa_sessions: qaResults,
          language,
        }),
      });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        // Cache in sessionStorage so the Result page shows it instantly without a round-trip
        // if the user lands there right after finishing (same tab).
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`session-feedback-${sessionId}`, JSON.stringify({
            id: `fb-${Date.now()}`,
            session_id: sessionId,
            strengths: fbData.strengths,
            improvements: fbData.improvements,
            recommendations: fbData.recommendations,
            created_at: new Date().toISOString(),
          }));
        }
        // Also persist to Supabase so revisiting the result later (e.g. via History, on a
        // different device, or after the sessionStorage cache is gone) still shows the real
        // feedback instead of falling back to a generic mock.
        if (!isDemoMode) {
          saveAiFeedback(sessionId, {
            strengths: fbData.strengths ?? [],
            improvements: fbData.improvements ?? [],
            recommendations: fbData.recommendations ?? [],
          }).catch((err) => console.warn('Failed to persist AI feedback:', err));
        }
      }
    } catch (fbErr) {
      console.warn('Feedback pre-generation error', fbErr);
    }

    // Redirect to Result Page
    router.push(`/presentations/${presentationId}/result?sessionId=${sessionId}`);
  };

  const activeMicDevice = mic.devices.find((d) => d.deviceId === mic.selectedDeviceId)?.label || (language === 'id' ? 'Mikrofon Sistem' : 'System Microphone');

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white p-4 sm:p-6 lg:p-8">

      {/* ─── Time's Up Modal ─── */}
      {showTimeUpModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md mx-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-3xl shadow-2xl overflow-hidden">
            {/* Accent top bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
            <div className="px-8 py-8 text-center">
              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-5">
                <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {language === 'id' ? '⏰ Waktu Habis!' : '⏰ Time\'s Up!'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-8 leading-relaxed">
                {language === 'id'
                  ? `Waktu presentasi ${presentation?.duration ?? 15} menit telah selesai. Anda bisa mengulang dari awal atau melanjutkan ke sesi Q&A.`
                  : `Your ${presentation?.duration ?? 15}-minute presentation time has ended. You can repeat from the beginning or continue to the Q&A session.`}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleRepeatPresentation}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white text-sm font-semibold transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {language === 'id' ? 'Ulangi Presentasi' : 'Repeat Presentation'}
                </button>
                <button
                  onClick={() => {
                    setShowTimeUpModal(false);
                    handleProceedToQA();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20"
                >
                  <ArrowRight className="w-4 h-4" />
                  {language === 'id' ? 'Lanjut ke Q&A' : 'Continue to Q&A'}
                </button>
              </div>
              {/* Dismiss: keep presenting */}
              <button
                onClick={() => setShowTimeUpModal(false)}
                className="mt-4 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors underline underline-offset-2"
              >
                {language === 'id' ? 'Tutup & lanjutkan presentasi' : 'Dismiss & keep presenting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-gray-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
              {stage === 'qa'
                ? (language === 'id' ? 'Sesi Q&A' : 'Q&A Session')
                : stage === 'presenting'
                  ? (language === 'id' ? 'Live Presentasi' : 'Live Presentation')
                  : (language === 'id' ? 'Persiapan Presentasi' : 'Presentation Prep')}
            </span>
            <span className="text-xs text-gray-400 dark:text-zinc-400">•</span>
            <span className="text-xs text-gray-400 dark:text-zinc-400">{getExaminerLabel(presentation?.examiner, language)}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate max-w-xl">
            {presentation?.title || 'Presentasi Baru'}
          </h1>
        </div>

        {/* Room Header Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Real-time Microphone Input Indicator */}
          <MicIndicator
            variant="header"
            volume={mic.volume}
            isSpeaking={mic.isSpeaking}
            hasPermission={mic.hasPermission}
            error={mic.error}
            isPaused={isPaused}
            isRecording={isRecording}
            deviceName={activeMicDevice}
            onRetry={mic.startMicrophone}
            language={language}
          />

          {/* Countdown / Timer Display */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border shadow-sm transition-colors ${
            countdownSeconds !== null && countdownSeconds <= 60 && stage === 'presenting'
              ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-500/50'
              : countdownSeconds !== null && countdownSeconds <= 180 && stage === 'presenting'
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-500/40'
                : 'bg-gray-100 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800'
          }`}>
            <Clock className={`w-4 h-4 flex-shrink-0 ${
              countdownSeconds !== null && countdownSeconds <= 60 && stage === 'presenting'
                ? 'text-red-600 dark:text-red-400 animate-pulse'
                : countdownSeconds !== null && countdownSeconds <= 180 && stage === 'presenting'
                  ? 'text-amber-600 dark:text-amber-400 animate-pulse'
                  : isRecording && !isPaused ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'text-gray-400 dark:text-zinc-400'
            }`} />
            <div className="flex flex-col leading-tight">
              {/* Context label: clarifies this is the FINAL presentation duration once in
                  Q&A / processing — not a live or per-question timer. */}
              {(stage === 'qa' || stage === 'processing') && (
                <span className="text-[9px] uppercase tracking-wide text-gray-400 dark:text-zinc-500 font-sans">
                  {language === 'id' ? 'Durasi Presentasi' : 'Presentation Duration'}
                </span>
              )}
              <div className="flex items-baseline gap-1.5">
                <span className={`font-mono text-sm font-semibold ${
                  countdownSeconds !== null && countdownSeconds <= 60 && stage === 'presenting'
                    ? 'text-red-600 dark:text-red-300'
                    : countdownSeconds !== null && countdownSeconds <= 180 && stage === 'presenting'
                      ? 'text-amber-600 dark:text-amber-300'
                      : 'text-gray-700 dark:text-zinc-200'
                }`}>
                  {stage === 'presenting' && countdownSeconds !== null
                    ? formatTime(countdownSeconds)
                    : formatTime(elapsedSeconds)}
                </span>
                {stage === 'presenting' && countdownSeconds !== null && (
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-sans">
                    {language === 'id' ? 'sisa' : 'left'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Start / Pause / Finish Buttons */}
          {stage === 'prep' && (
            <button
              onClick={handleStartPresentation}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              <Play className="w-4 h-4 fill-white" />
              {language === 'id' ? 'Mulai Presentasi' : 'Start Presentation'}
            </button>
          )}

          {stage === 'presenting' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePause}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs text-gray-700 dark:text-zinc-200 transition-colors border border-gray-200 dark:border-zinc-700"
              >
                {isPaused ? <Play className="w-4 h-4 fill-current text-green-600 dark:text-green-400" /> : <Pause className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />}
                {isPaused
                  ? (language === 'id' ? 'Lanjutkan' : 'Resume')
                  : (language === 'id' ? 'Jeda' : 'Pause')}
              </button>

              <button
                onClick={handleProceedToQA}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                {language === 'id' ? 'Selesai & Lanjut Q&A' : 'Finish & Go to Q&A'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Room Body */}
      {stage === 'processing' ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center mb-5 animate-pulse">
            <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {isTranscribing
              ? (language === 'id' ? 'Menyiapkan Sesi Tanya Jawab...' : 'Preparing the Q&A Session...')
              : (language === 'id' ? 'AI Sedang Memproses Hasil Presentasi...' : 'AI is Processing Your Presentation...')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm">
            {isTranscribing
              ? (language === 'id'
                  ? 'Mentranskrip rekaman suara secara verbatim & menyusun pertanyaan penguji.'
                  : 'Transcribing your recorded speech verbatim & composing examiner questions.')
              : (language === 'id'
                  ? 'Menganalisis kejernihan vokal, penguasaan materi, dan ekspresi bahasa tubuh Anda.'
                  : "Analyzing your vocal clarity, content mastery, and body language expression.")}
          </p>
        </div>
      ) : stage === 'qa' ? (
        <div className="flex-1 py-8">
          <QASection
            questions={questions}
            examiner={presentation?.examiner || 'general_audience'}
            materialContext={
              materialText
                ? materialText.slice(0, 1500)
                : presentation?.description || presentation?.title || 'Materi Presentasi'
            }
            language={language}
            onComplete={handleFinishSession}
            questionMode={presentation?.question_count_mode || 'auto'}
            difficulty={presentation?.difficulty || 'medium'}
          />
        </div>
      ) : (
        /* Dual-Pane Presentation Mode: Slides on Left, Camera on Right */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-7 mt-6">
          {/* Left Column: Slide Viewer (8 cols) */}
          <div className="lg:col-span-8 flex flex-col h-full min-h-[480px]">
            <SlideViewer
              title={presentation?.title}
              materialText={materialText}
              slideImages={slideImages}
              fileData={fileData}
              originalSlidesCount={slideCount}
              currentSlide={currentSlide}
              onSlideChange={setCurrentSlide}
              slidesCount={6}
              presentationId={presentationId}
              language={language}
            />

            {/* Live Real-Time Speech Transcript Ticker */}
            <div className="mt-6 p-4 rounded-2xl bg-white dark:bg-zinc-900/70 border border-gray-200 dark:border-zinc-800/80 backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <MicIndicator
                    variant="ticker"
                    volume={mic.volume}
                    isSpeaking={mic.isSpeaking}
                    hasPermission={mic.hasPermission}
                    error={mic.error}
                    isPaused={isPaused}
                    language={language}
                  />
                  <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                    {language === 'id' ? 'Transkrip Bicara Real-Time (Live)' : 'Real-Time Speech Transcript (Live)'}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400 dark:text-zinc-400 font-mono">
                  {stt.wordsCount} {language === 'id' ? 'kata terdeteksi' : 'words detected'}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-300 min-h-[38px] leading-relaxed italic line-clamp-2">
                {stt.transcript || stt.interimTranscript ? (
                  `"${stt.transcript} ${stt.interimTranscript}"`
                ) : isRecording ? (
                  mic.isSpeaking
                    ? (language === 'id' ? 'Suara terdeteksi... memproses pengenalan kata AI...' : 'Voice detected... processing AI word recognition...')
                    : (language === 'id' ? 'Bicaralah di depan mikrofon untuk melihat transkrip real-time...' : 'Speak in front of the microphone to see the real-time transcript...')
                ) : (
                  language === 'id'
                    ? 'Klik "Mulai Presentasi" untuk mengaktifkan perekaman suara dan evaluasi AI.'
                    : 'Click "Start Presentation" to enable voice recording and AI evaluation.'
                )}
              </p>
            </div>
          </div>

          {/* Right Column: Camera Preview & Real-Time AI Metrics (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="w-full">
              <CameraPreview
                videoRef={camera.videoRef}
                hasPermission={camera.hasPermission}
                error={camera.error}
                isReady={camera.isReady}
                onRetry={camera.startCamera}
                onMetricsUpdate={handleMetricsUpdate}
                micVolume={mic.volume}
                micSpeaking={mic.isSpeaking}
                hasMicPermission={mic.hasPermission}
                micError={mic.error}
                language={language}
              />
            </div>

            {/* Real-time AI Feedback Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
                    {language === 'id' ? 'Analisis Bahasa Tubuh (MediaPipe)' : 'Body Language Analysis (MediaPipe)'}
                  </h4>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {liveMetrics.bodyLanguageScore}%
                </span>
              </div>

              {/* Metric Bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-zinc-400">{language === 'id' ? 'Kontak Mata Kamera' : 'Camera Eye Contact'}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{liveMetrics.eyeContactScore}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${liveMetrics.eyeContactScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-zinc-400">{language === 'id' ? 'Postur Tubuh Sejajar' : 'Aligned Posture'}</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{liveMetrics.postureScore}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${liveMetrics.postureScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-zinc-400">{language === 'id' ? 'Gestur & Ekspresi' : 'Gesture & Expression'}</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{liveMetrics.gestureScore}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${liveMetrics.gestureScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* AI Live Tip */}
              <div className="pt-2 border-t border-gray-200 dark:border-zinc-800/80">
                <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300/90 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
                  {language === 'id'
                    ? (liveMetrics.eyeContactScore < 65
                        ? 'Tatap langsung ke arah lensa kamera agar kontak mata dan kepercayaan diri terlihat maksimal.'
                        : liveMetrics.postureScore < 72
                          ? 'Tegakkan bahu dan posisikan tubuh di tengah kamera untuk postur yang seimbang dan tegap.'
                          : liveMetrics.gestureScore < 72
                            ? 'Gunakan gestur tangan terbuka secara alami untuk menekankan poin penting presentasi.'
                            : 'Bahasa tubuh dan fokus Anda sangat baik! Pertahankan ketenangan dan ritme ini.')
                    : (liveMetrics.eyeContactScore < 65
                        ? 'Look directly into the camera lens for maximum eye contact and confidence.'
                        : liveMetrics.postureScore < 72
                          ? 'Straighten your shoulders and center your body on camera for a balanced, upright posture.'
                          : liveMetrics.gestureScore < 72
                            ? 'Use natural open-hand gestures to emphasize key points in your presentation.'
                            : 'Your body language and focus are excellent! Keep this calm, steady rhythm.')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
