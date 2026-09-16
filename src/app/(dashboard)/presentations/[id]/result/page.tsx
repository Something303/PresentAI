'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  LayoutDashboard,
  Mic,
  Eye,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Share2,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScoreRing, ScoreBadge } from '@/components/ui/ScoreRing';
import {
  getStoredPresentations,
  getStoredSessions,
  getMockAIFeedback
} from '@/lib/mock/data';
import {
  getPresentationById,
  getPracticeSessionById,
  getPracticeSessions,
  getQaSessionsForSession,
  getAiFeedback,
  saveAiFeedback,
} from '@/lib/supabase/data';
import { getPerformanceLevel, getScoreColor, isDemoMode } from '@/lib/config';
import type { PracticeSession, Presentation, AIFeedback, QASession } from '@/types';

export default function PresentationResultPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const presentationId = (params?.id as string) || 'pres-001';
  const sessionId = searchParams.get('sessionId');
  const { t, language } = useLanguage();

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [qaItems, setQaItems] = useState<QASession[]>([]);
  const [speechMetrics, setSpeechMetrics] = useState({
    wpm: 128,
    fillerCount: 3,
    pauses: 5,
    clarity: 88,
  });
  const [bodyMetrics, setBodyMetrics] = useState({
    eyeContact: 85,
    posture: 85,
  });

  useEffect(() => {
    const load = async () => {
      // Load presentation — real accounts read from Supabase (RLS-scoped), demo mode keeps
      // the localStorage-backed list.
      let pres: Presentation | null | undefined;
      if (isDemoMode) {
        const presentations = getStoredPresentations();
        pres = presentations.find((p) => p.id === presentationId) || presentations[0];
      } else {
        pres = await getPresentationById(presentationId);
      }
      setPresentation(pres ?? null);

      // Load session
      let currentSession: PracticeSession | undefined;
      if (isDemoMode) {
        const sessions = getStoredSessions();
        if (sessionId) {
          currentSession = sessions.find((s) => s.id === sessionId);
        }
        if (!currentSession) {
          currentSession = sessions.find((s) => s.presentation_id === presentationId) || sessions[0];
        }
      } else {
        if (sessionId) {
          currentSession = (await getPracticeSessionById(sessionId)) ?? undefined;
        }
        if (!currentSession) {
          const sessions = await getPracticeSessions();
          currentSession = sessions.find((s) => s.presentation_id === presentationId) || sessions[0];
        }
      }
      setSession(currentSession || null);

      if (!currentSession) return;

      let parsedDetails: {
        wpm?: number;
        fillerCount?: number;
        liveMetrics?: { eyeContactScore?: number; postureScore?: number };
        qaResults?: QASession[];
      } = {};

      // Load additional stored details if present
      if (typeof window !== 'undefined') {
        try {
          const stored = sessionStorage.getItem(`session-details-${currentSession.id}`);
          if (stored) {
            parsedDetails = JSON.parse(stored);
            if (parsedDetails.wpm !== undefined) {
              setSpeechMetrics((prev) => ({
                ...prev,
                wpm: parsedDetails.wpm ?? 128,
                fillerCount: parsedDetails.fillerCount ?? 0,
              }));
            }
            if (parsedDetails.liveMetrics) {
              setBodyMetrics({
                eyeContact: parsedDetails.liveMetrics.eyeContactScore ?? currentSession.body_language_score,
                posture: parsedDetails.liveMetrics.postureScore ?? currentSession.body_language_score,
              });
            } else {
              setBodyMetrics({
                eyeContact: currentSession.body_language_score,
                posture: currentSession.body_language_score,
              });
            }
            if (parsedDetails.qaResults) {
              setQaItems(parsedDetails.qaResults);
            }
          } else {
            setBodyMetrics({
              eyeContact: currentSession.body_language_score,
              posture: currentSession.body_language_score,
            });
          }
        } catch {
          setBodyMetrics({
            eyeContact: currentSession.body_language_score,
            posture: currentSession.body_language_score,
          });
        }

        // Reached via History (no same-tab sessionStorage cache) — fall back to the
        // persisted Q&A rows for real accounts.
        if (!parsedDetails.qaResults && !isDemoMode) {
          try {
            const qa = await getQaSessionsForSession(currentSession.id);
            if (qa.length > 0) setQaItems(qa);
          } catch {}
        }

        // Check cached feedback or generate via AI
        try {
          const cachedFb = sessionStorage.getItem(`session-feedback-${currentSession.id}`);
          if (cachedFb) {
            setFeedback(JSON.parse(cachedFb));
            return;
          }
        } catch {}

        if (!isDemoMode) {
          try {
            const savedFb = await getAiFeedback(currentSession.id);
            if (savedFb) {
              setFeedback(savedFb);
              return;
            }
          } catch {}
        }

        setIsFeedbackLoading(true);
        fetch('/api/generate-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            presentation_title: pres?.title || t('result.defaultTitle'),
            transcript: currentSession.transcript,
            scores: {
              overall: currentSession.overall_score,
              content: currentSession.content_score,
              speech: currentSession.speech_score,
              intonation: currentSession.intonation_score,
              body_language: currentSession.body_language_score,
              structure: currentSession.structure_score,
              qa: currentSession.qa_score,
            },
            speech_data: {
              words_per_minute: parsedDetails.wpm ?? speechMetrics.wpm,
              filler_words: parsedDetails.fillerCount ?? speechMetrics.fillerCount,
            },
            body_data: {
              eye_contact_score: parsedDetails.liveMetrics?.eyeContactScore ?? currentSession.body_language_score,
              posture_score: parsedDetails.liveMetrics?.postureScore ?? currentSession.body_language_score,
            },
            qa_sessions: parsedDetails.qaResults ?? [],
            // Was hardcoded to 'id' regardless of the user's actual language — meaning the AI
            // feedback (strengths/improvements/recommendations) was always generated in
            // Indonesian even when the whole app was switched to English.
            language,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.strengths) {
              const newFb: AIFeedback = {
                id: `fb-${Date.now()}`,
                session_id: currentSession.id,
                strengths: data.strengths,
                improvements: data.improvements,
                recommendations: data.recommendations,
                created_at: new Date().toISOString(),
              };
              setFeedback(newFb);
              sessionStorage.setItem(`session-feedback-${currentSession.id}`, JSON.stringify(newFb));
              if (!isDemoMode) {
                saveAiFeedback(currentSession.id, {
                  strengths: newFb.strengths,
                  improvements: newFb.improvements,
                  recommendations: newFb.recommendations,
                }).catch(() => {});
              }
            } else {
              setFeedback(getMockAIFeedback(currentSession.id));
            }
          })
          .catch(() => {
            setFeedback(getMockAIFeedback(currentSession.id));
          })
          .finally(() => {
            setIsFeedbackLoading(false);
          });
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentationId, sessionId, language]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-400">{t('result.loadingResult')}</p>
        </div>
      </div>
    );
  }

  // Radar chart data for 6 dimensions
  const radarData = [
    { subject: `${t('result.radarContent')} (25%)`, score: session.content_score, fullMark: 100 },
    { subject: `${t('result.radarSpeech')} (20%)`, score: session.speech_score, fullMark: 100 },
    { subject: `${t('result.radarIntonation')} (15%)`, score: session.intonation_score, fullMark: 100 },
    { subject: `${t('result.radarBody')} (15%)`, score: session.body_language_score, fullMark: 100 },
    { subject: `${t('result.radarStructure')} (10%)`, score: session.structure_score, fullMark: 100 },
    { subject: `${t('result.radarQa')} (15%)`, score: session.qa_score, fullMark: 100 },
  ];

  const categories = [
    { label: t('result.categoryContent'), score: session.content_score, weight: '25%', icon: BookOpen, color: 'text-blue-400' },
    { label: t('result.categorySpeech'), score: session.speech_score, weight: '20%', icon: Mic, color: 'text-emerald-400' },
    { label: t('result.categoryIntonation'), score: session.intonation_score, weight: '15%', icon: TrendingUp, color: 'text-purple-400' },
    { label: t('result.categoryBody'), score: session.body_language_score, weight: '15%', icon: Eye, color: 'text-amber-400' },
    { label: t('result.categoryStructure'), score: session.structure_score, weight: '10%', icon: FileText, color: 'text-cyan-400' },
    { label: t('result.categoryQa'), score: session.qa_score, weight: '15%', icon: MessageSquare, color: 'text-indigo-400' },
  ];

  const dateLocale = language === 'id' ? 'id-ID' : 'en-US';
  const durationMinutes = Math.floor(session.duration / 60);
  const durationSeconds = session.duration % 60;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-950/40 via-zinc-900 to-zinc-900 border border-zinc-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {t('result.reportBadge')}
            </span>
            <span className="text-xs text-zinc-400">•</span>
            <span className="text-xs text-zinc-400">
              {new Date(session.created_at).toLocaleDateString(dateLocale, { dateStyle: 'long' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {presentation?.title || t('result.defaultTitle')}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {t('result.practiceDuration')}: {durationMinutes} {t('common.minutes')} {durationSeconds} {t('common.seconds')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/presentations/${presentationId}/room`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors border border-zinc-700"
          >
            <RotateCcw className="w-4 h-4" />
            {t('result.practiceAgain')}
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shadow-lg shadow-blue-500/20"
          >
            <LayoutDashboard className="w-4 h-4" />
            {t('result.backToDashboard')}
          </Link>
        </div>
      </div>

      {/* Main Score & Radar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Overall Score Card (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 text-center shadow-lg">
          <div className="mb-4">
            <ScoreRing score={session.overall_score} size="lg" showLabel={false} />
          </div>

          <div className="mt-2 mb-1 flex items-center gap-2">
            <h2 className="text-4xl font-extrabold text-white font-mono">
              {session.overall_score}
            </h2>
            <span className="text-base font-medium text-zinc-400">/ 100</span>
          </div>

          <div className="mb-3">
            <ScoreBadge score={session.overall_score} />
          </div>

          <p className="text-xs text-zinc-400 max-w-xs mt-2 leading-relaxed">
            {/* Matches the same score bands as getPerformanceLevel() in lib/config.ts —
                previously this was just a >=80 vs. everything-else check, so a score as low
                as 17 still got the same "good performance, solid foundation" message. */}
            {session.overall_score >= 90
              ? t('result.scoreExcellentDesc')
              : session.overall_score >= 80
                ? t('result.scoreVeryGoodDesc')
                : session.overall_score >= 70
                  ? t('result.scoreGoodDesc')
                  : session.overall_score >= 60
                    ? t('result.scoreNeedsImprovementDesc')
                    : t('result.scoreBeginnerDesc')}
          </p>
        </div>

        {/* Radar Performance Chart (7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">{t('result.radarTitle')}</h3>
            </div>
            <span className="text-xs text-zinc-400 font-mono">Target: 85+</span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#3f3f46" />
                <PolarAngleAxis dataKey="subject" stroke="#a1a1aa" tick={{ fill: '#d4d4d8', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#52525b" />
                <Radar
                  name={t('result.yourScoreSeries')}
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.45}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 6 Category Breakdown Cards */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">{t('result.categoryBreakdownTitle')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60">
                      <Icon className={`w-4 h-4 ${cat.color}`} />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white">{cat.label}</h4>
                      <span className="text-[10px] text-zinc-400">{t('result.weightLabel')} {cat.weight}</span>
                    </div>
                  </div>
                  <span className={`text-base font-bold font-mono ${getScoreColor(cat.score)}`}>
                    {cat.score}
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Speech & Body Language Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Speech Stats */}
        <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Mic className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">{t('result.speechStats')}</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/60">
              <span className="text-xs text-zinc-400">{t('result.speechRateLabel')}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-white">{speechMetrics.wpm}</span>
                <span className="text-xs text-zinc-400">WPM</span>
              </div>
              <span className="text-[11px] text-emerald-400 mt-1 inline-block">{t('result.idealRangeLabel')}</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/60">
              <span className="text-xs text-zinc-400">{t('result.fillerWordsLabel')}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-white">{speechMetrics.fillerCount}</span>
                <span className="text-xs text-zinc-400">{t('result.timesUnit')}</span>
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 inline-block">{t('result.fillerExamples')}</span>
            </div>
          </div>
        </div>

        {/* Body Language Stats */}
        <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">{t('result.bodyStats')}</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/60">
              <span className="text-xs text-zinc-400">{t('result.eyeContactLabel')}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-emerald-400">{bodyMetrics.eyeContact}%</span>
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 inline-block">{t('result.gazeConsistencyLabel')}</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/60">
              <span className="text-xs text-zinc-400">{t('result.postureAlignmentLabel')}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-blue-400">{bodyMetrics.posture}%</span>
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 inline-block">{t('result.uprightCenteredLabel')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Qualitative Feedback: Strengths, Improvements, Recommendations */}
      {isFeedbackLoading ? (
        <div className="p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-semibold text-white">{t('result.aiCoachAnalyzing')}</p>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            {t('result.aiCoachGenerating')}
          </p>
        </div>
      ) : feedback ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Strengths */}
          <div className="p-6 rounded-3xl bg-zinc-900/90 border border-emerald-900/30">
            <div className="flex items-center gap-2 text-emerald-400 mb-4">
              <CheckCircle2 className="w-5 h-5" />
              <h4 className="text-sm font-bold text-white">{t('result.strengths')}</h4>
            </div>
            <ul className="space-y-3">
              {feedback.strengths.map((str, i) => (
                <li key={i} className="text-xs text-zinc-300 leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  {str}
                </li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div className="p-6 rounded-3xl bg-zinc-900/90 border border-amber-900/30">
            <div className="flex items-center gap-2 text-amber-400 mb-4">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="text-sm font-bold text-white">{t('result.improvements')}</h4>
            </div>
            <ul className="space-y-3">
              {feedback.improvements.map((imp, i) => (
                <li key={i} className="text-xs text-zinc-300 leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  {imp}
                </li>
              ))}
            </ul>
          </div>

          {/* Action Recommendations */}
          <div className="p-6 rounded-3xl bg-zinc-900/90 border border-blue-900/30">
            <div className="flex items-center gap-2 text-blue-400 mb-4">
              <Sparkles className="w-5 h-5" />
              <h4 className="text-sm font-bold text-white">{t('result.recommendations')}</h4>
            </div>
            <ul className="space-y-3">
              {feedback.recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-zinc-300 leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {/* Q&A Evaluation Summary if present */}
      {qaItems.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">{t('result.qaReviewTitle')}</h3>
          </div>

          <div className="space-y-4">
            {qaItems.map((qa, index) => (
              <div key={index} className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-400">{t('result.questionLabel')} {index + 1}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-bold">
                    {t('result.scoreLabel')}: {qa.score}/100
                  </span>
                </div>
                <p className="text-sm font-medium text-white mb-2">"{qa.question}"</p>
                <p className="text-xs text-zinc-300 italic mb-3">{t('result.yourAnswerLabel')}: "{qa.answer}"</p>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/60 text-xs text-zinc-300 leading-relaxed">
                  <span className="font-semibold text-zinc-200">{t('result.aiFeedbackLabel')}: </span>
                  {qa.feedback}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
