'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Sparkles,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  ArrowRight,
  LineChart as LineChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { getStoredSessions } from '@/lib/mock/data';
import { getPracticeSessions } from '@/lib/supabase/data';
import { isDemoMode } from '@/lib/config';
import type { PracticeSession } from '@/types';

type TimeRange = 'month' | 'quarter' | 'year';
type CategoryKey = 'content' | 'speech' | 'intonation' | 'body_language' | 'structure' | 'qa';

const CATEGORY_LABEL_KEY: Record<CategoryKey, string> = {
  content: 'progress.contentProgress',
  speech: 'progress.speechProgress',
  intonation: 'progress.intonationProgress',
  body_language: 'progress.bodyProgress',
  structure: 'progress.structureProgress',
  qa: 'progress.qaProgress',
};

function getCategoryScore(s: PracticeSession, key: CategoryKey): number {
  switch (key) {
    case 'content': return s.content_score;
    case 'speech': return s.speech_score;
    case 'intonation': return s.intonation_score;
    case 'body_language': return s.body_language_score;
    case 'structure': return s.structure_score;
    case 'qa': return s.qa_score;
  }
}

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

// Shared tooltip style for both charts — reuses the app's existing theme-reactive CSS
// variables (already toggled by the .dark class in globals.css) instead of hardcoded hex,
// so the tooltip follows light/dark mode like the rest of the app.
const chartTooltipStyle = {
  background: 'var(--toast-bg)',
  border: '1px solid var(--toast-border)',
  borderRadius: '12px',
  color: 'var(--toast-color)',
  fontSize: '12px',
};

export default function ProgressPage() {
  const { t, language } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [allSessions, setAllSessions] = useState<PracticeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load real practice sessions — Supabase (RLS-scoped to this user) for real accounts,
  // localStorage only for demo mode (client-only, since localStorage isn't available
  // during SSR).
  useEffect(() => {
    const load = async () => {
      setAllSessions(isDemoMode ? getStoredSessions() : await getPracticeSessions());
      setIsLoading(false);
    };
    load();
  }, []);

  // Filter to the selected time range, oldest → newest (chronological, for charting).
  const filteredSessions = useMemo(() => {
    const sorted = allSessions
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const now = new Date();
    let cutoff: Date;
    if (timeRange === 'month') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'quarter') {
      cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else {
      cutoff = new Date(now.getFullYear(), 0, 1); // Jan 1st of this year
    }
    return sorted.filter((s) => new Date(s.created_at) >= cutoff);
  }, [allSessions, timeRange]);

  // All derived analytics computed from the REAL filtered sessions — no fabricated numbers.
  const analytics = useMemo(() => {
    const sessions = filteredSessions;
    if (sessions.length === 0) return null;

    const categories: CategoryKey[] = ['content', 'speech', 'intonation', 'body_language', 'structure', 'qa'];
    const categoryAverages = categories.map((key) => ({
      key,
      avgScore: avg(sessions.map((s) => getCategoryScore(s, key))),
    }));
    const strongest = categoryAverages.reduce((best, cur) => (cur.avgScore > best.avgScore ? cur : best));
    const weakest = categoryAverages.reduce((worst, cur) => (cur.avgScore < worst.avgScore ? cur : worst));

    // Most improved: compare the first half of the range vs the second half per category.
    let mostImproved = strongest;
    let mostImprovedDelta = 0;
    if (sessions.length >= 2) {
      const mid = Math.ceil(sessions.length / 2);
      const firstHalf = sessions.slice(0, mid);
      const secondHalf = sessions.slice(sessions.length - mid);
      const deltas = categories.map((key) => ({
        key,
        avgScore: avg(sessions.map((s) => getCategoryScore(s, key))),
        delta: avg(secondHalf.map((s) => getCategoryScore(s, key))) - avg(firstHalf.map((s) => getCategoryScore(s, key))),
      }));
      const best = deltas.reduce((b, cur) => (cur.delta > b.delta ? cur : b));
      mostImproved = { key: best.key, avgScore: best.avgScore };
      mostImprovedDelta = Math.round(best.delta);
    }

    const first = sessions[0];
    const latest = sessions[sessions.length - 1];
    const pointChange = Math.round(latest.overall_score - first.overall_score);
    const percentChange = first.overall_score > 0
      ? Math.round(((latest.overall_score - first.overall_score) / first.overall_score) * 100)
      : 0;

    // Practice consistency: real sessions-per-week over the span actually covered.
    const spanMs = new Date(latest.created_at).getTime() - new Date(first.created_at).getTime();
    const spanWeeks = Math.max(1, spanMs / (7 * 24 * 60 * 60 * 1000));
    const sessionsPerWeek = sessions.length / spanWeeks;

    const trendData = sessions.map((s) => ({
      date: new Date(s.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'short',
      }),
      overall: s.overall_score,
      speech: s.speech_score,
      content: s.content_score,
      body: s.body_language_score,
      qa: s.qa_score,
    }));

    return {
      latestScore: latest.overall_score,
      pointChange,
      percentChange,
      strongest,
      weakest,
      mostImproved,
      mostImprovedDelta,
      sessionsPerWeek,
      sessionCount: sessions.length,
      trendData,
    };
  }, [filteredSessions, language]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {t('progress.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            {t('progress.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-3 sm:inline-grid sm:grid-flow-col gap-1 bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl border border-gray-200 dark:border-zinc-800 text-xs w-full sm:w-auto">
          <button
            onClick={() => setTimeRange('month')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium text-center transition-colors ${
              timeRange === 'month'
                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t('progress.rangeLast30Days')}
          </button>
          <button
            onClick={() => setTimeRange('quarter')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium text-center whitespace-nowrap transition-colors ${
              timeRange === 'quarter'
                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t('progress.rangeLast3Months')}
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium text-center whitespace-nowrap transition-colors ${
              timeRange === 'year'
                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t('progress.rangeThisYear')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {/* KPI card skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-3xl bg-gray-100 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 animate-pulse" />
            ))}
          </div>
          {/* Chart skeletons */}
          <div className="h-96 rounded-3xl bg-gray-100 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 animate-pulse" />
          <div className="h-96 rounded-3xl bg-gray-100 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 animate-pulse" />
          {/* Insight banner skeleton */}
          <div className="h-32 rounded-3xl bg-gray-100 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 animate-pulse" />
        </div>
      ) : !analytics ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
            <LineChartIcon className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
          </div>
          <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-xs mb-5">{t('progress.noData')}</p>
          <Link
            href="/new-presentation"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-500/20"
          >
            {t('progress.ctaButton')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 text-xs mb-2">
                <span>{t('progress.latestAvgScore')}</span>
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-gray-900 dark:text-white">{Math.round(analytics.latestScore)}</span>
                {analytics.pointChange !== 0 && (
                  <span className={`text-xs font-semibold flex items-center ${analytics.pointChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {analytics.pointChange >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {analytics.pointChange >= 0 ? '+' : ''}{analytics.pointChange} {t('progress.points')}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-400 dark:text-zinc-500 mt-2 block">{t('progress.sinceFirstSession')}</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 text-xs mb-2">
                <span>{t('progress.strongestSkill')}</span>
                <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white block mt-1">{t(CATEGORY_LABEL_KEY[analytics.strongest.key])}</span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 block">
                {t('progress.avgScoreCaption')} {Math.round(analytics.strongest.avgScore)}%
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 text-xs mb-2">
                <span>{t('progress.mostImproved')}</span>
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white block mt-1">{t(CATEGORY_LABEL_KEY[analytics.mostImproved.key])}</span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block">
                {analytics.mostImprovedDelta >= 0 ? '+' : ''}{analytics.mostImprovedDelta} {t('progress.points')}
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 text-xs mb-2">
                <span>{t('progress.practiceConsistency')}</span>
                <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white block mt-1">
                {analytics.sessionsPerWeek.toFixed(1)}x {t('progress.perWeek')}
              </span>
              <span className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 block">
                {analytics.sessionCount} {t('progress.sessionsLabel')}
              </span>
            </div>
          </div>

          {/* Main Overall Progress Chart */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('progress.overallTrendTitle')}</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{t('progress.overallTrendDesc')}</p>
              </div>
              {analytics.percentChange !== 0 && (
                <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${
                  analytics.percentChange >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                    : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                }`}>
                  {analytics.percentChange >= 0 ? '+' : ''}{analytics.percentChange}%{' '}
                  {analytics.percentChange >= 0 ? t('progress.increaseSuffix') : t('progress.decreaseSuffix')}
                </span>
              )}
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-zinc-800" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-gray-500 dark:text-zinc-400" tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} className="text-gray-500 dark:text-zinc-400" tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="overall"
                    name={t('progress.overallProgress')}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorOverall)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Multi-metric Line Chart */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('progress.comparisonTitle')}</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{t('progress.comparisonDesc')}</p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-zinc-800" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-gray-500 dark:text-zinc-400" tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} className="text-gray-500 dark:text-zinc-400" tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="speech" name={t('progress.speechProgress')} stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="content" name={t('progress.contentProgress')} stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="body" name={t('progress.bodyProgress')} stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="qa" name={t('progress.qaProgress')} stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data-driven Insight Banner (computed from real scores — not a canned/fabricated claim) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50 to-white dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-zinc-900 border border-blue-200 dark:border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Sparkles className="w-5 h-5" />
                <h4 className="text-base font-bold text-gray-900 dark:text-white">{t('progress.aiInsight')}</h4>
              </div>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-zinc-300 leading-relaxed max-w-2xl">
                {t('progress.insightPart1')}{' '}
                <strong>{t(CATEGORY_LABEL_KEY[analytics.strongest.key])}</strong>{' '}
                ({Math.round(analytics.strongest.avgScore)}%), {t('progress.insightPart2')}{' '}
                <strong>{t(CATEGORY_LABEL_KEY[analytics.weakest.key])}</strong>{' '}
                ({Math.round(analytics.weakest.avgScore)}%){t('progress.insightPart3')}
              </p>
            </div>

            <Link
              href="/new-presentation"
              className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-lg shadow-blue-500/25"
            >
              {t('progress.ctaButton')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
