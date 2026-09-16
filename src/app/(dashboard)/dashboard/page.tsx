'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScoreRing, ScoreBadge } from '@/components/ui/ScoreRing';
import { LoadingState, SkeletonCard, EmptyState } from '@/components/ui/States';
import {
  getMockDashboardStats,
  getMockChartData,
  getStoredSessions,
  MOCK_PRESENTATIONS,
} from '@/lib/mock/data';
import { getPracticeSessions } from '@/lib/supabase/data';
import { getGreeting, formatDate, formatDuration } from '@/lib/utils';
import { getPerformanceLevel, getScoreColor, isDemoMode } from '@/lib/config';
import type { DashboardStats, PracticeSession } from '@/types';
import type { DashboardRecommendationResponse } from '@/app/api/dashboard-recommendation/route';
import {
  TrendingUp, TrendingDown, Award, BarChart3, Plus,
  Clock, Calendar, ChevronRight, Sparkles, Presentation
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<{ date: string; score: number }[]>([]);
  const [recentSessions, setRecentSessions] = useState<PracticeSession[]>([]);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      await new Promise((r) => setTimeout(r, 800));
      // Real accounts read their practice sessions from Supabase (RLS-scoped to this user)
      // instead of the shared browser localStorage — previously every account on the same
      // browser saw identical stats/history since localStorage isn't tied to who's logged in.
      const sessions = isDemoMode ? getStoredSessions() : await getPracticeSessions();
      const statsData = getMockDashboardStats(sessions);
      setStats(statsData);
      setChartData(getMockChartData(language, sessions));
      setRecentSessions(sessions.slice(0, 5));
      setIsLoading(false);

      // Ask AI for a real, personalized tip based on this account's actual category
      // averages — previously this card showed the same hardcoded sentence for everyone.
      setIsRecommendationLoading(true);
      try {
        const avg = (nums: number[]) =>
          nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
        const recentForTip = sessions.slice(0, 5);
        const categoryAverages = {
          content: avg(recentForTip.map((s) => s.content_score)),
          speech: avg(recentForTip.map((s) => s.speech_score)),
          intonation: avg(recentForTip.map((s) => s.intonation_score)),
          body_language: avg(recentForTip.map((s) => s.body_language_score)),
          structure: avg(recentForTip.map((s) => s.structure_score)),
          qa: avg(recentForTip.map((s) => s.qa_score)),
        };
        const trend: 'improving' | 'declining' | 'stable' =
          statsData.improvement > 3 ? 'improving' : statsData.improvement < -3 ? 'declining' : 'stable';

        const res = await fetch('/api/dashboard-recommendation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language,
            average_score: statsData.average_score,
            total_practices: statsData.total_practices,
            category_averages: categoryAverages,
            trend,
          }),
        });
        const data = (await res.json()) as DashboardRecommendationResponse;
        setAiRecommendation(data.recommendation);
      } catch (err) {
        console.warn('Failed to fetch AI recommendation:', err);
        setAiRecommendation(
          language === 'id'
            ? 'Terus berlatih secara rutin untuk meningkatkan kemampuan presentasimu secara bertahap!'
            : 'Keep practicing regularly to steadily improve your presentation skills!'
        );
      } finally {
        setIsRecommendationLoading(false);
      }
    };
    load();
  }, [language]);

  const greeting = getGreeting(language);
  const greetingText = `${t(`dashboard.greeting.${greeting}`)}, ${user?.name?.split(' ')[0] ?? 'User'}!`;

  const statCards = stats
    ? [
        {
          label: t('dashboard.stats.averageScore'),
          value: stats.average_score,
          suffix: '/100',
          icon: <BarChart3 className="w-5 h-5" />,
          color: 'text-brand-600 dark:text-brand-400',
          bg: 'bg-brand-50 dark:bg-brand-950/50',
          trend: null,
        },
        {
          label: t('dashboard.stats.totalPractices'),
          value: stats.total_practices,
          suffix: '',
          icon: <Presentation className="w-5 h-5" />,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-950/50',
          trend: null,
        },
        {
          label: t('dashboard.stats.highestScore'),
          value: stats.highest_score,
          suffix: '/100',
          icon: <Award className="w-5 h-5" />,
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-50 dark:bg-green-950/50',
          trend: null,
        },
        {
          label: t('dashboard.stats.improvement'),
          value: Math.abs(stats.improvement),
          suffix: '%',
          icon: stats.improvement >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />,
          color: stats.improvement >= 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400',
          bg: stats.improvement >= 0
            ? 'bg-emerald-50 dark:bg-emerald-950/50'
            : 'bg-red-50 dark:bg-red-950/50',
          trend: stats.improvement,
        },
      ]
    : [];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{greetingText}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {language === 'id'
              ? 'Selamat berlatih hari ini!'
              : 'Ready to practice today?'}
          </p>
        </div>
        <Link href="/new-presentation" className="btn-primary">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('nav.newPresentation')}</span>
        </Link>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', card.bg, card.color)}>
                  {card.icon}
                </div>
                {card.trend !== null && (
                  <span className={cn(
                    'text-xs font-semibold',
                    card.trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {card.trend >= 0 ? '+' : '-'}{Math.abs(card.trend)}%
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-gray-100">
                {card.value}
                <span className="text-sm font-normal text-gray-400 ml-0.5">{card.suffix}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.chart.title')}</h2>
          </div>
          {isLoading ? (
            <div className="h-48 skeleton rounded-xl" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-gray-500 dark:text-gray-400" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--toast-bg)',
                    border: '1px solid var(--toast-border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(v: number) => [`${v}`, t('dashboard.chart.score')]}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#scoreGrad)"
                  dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState description={t('dashboard.noRecentPresentations')} />
          )}
        </div>

        {/* AI Recommendation */}
        <div className="card p-5 bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-950/30 dark:to-purple-950/30 border-brand-100 dark:border-brand-900">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.aiRecommendation')}</h2>
          </div>
          {isRecommendationLoading ? (
            <div className="space-y-2">
              <div className="skeleton h-3 rounded w-full" />
              <div className="skeleton h-3 rounded w-5/6" />
              <div className="skeleton h-3 rounded w-4/6" />
            </div>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{aiRecommendation}</p>
          )}

          {!isRecommendationLoading && (
            <div className="mt-4 pt-4 border-t border-brand-100 dark:border-brand-900/50">
              <Link
                href="/new-presentation"
                className="text-brand-600 dark:text-brand-400 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all"
              >
                {t('dashboard.startPracticing')}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Presentations */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.recentPresentations')}</h2>
          <Link href="/history" className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:underline">
            {t('dashboard.viewAll')}
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 rounded w-1/3" />
                  <div className="skeleton h-3 rounded w-1/4" />
                </div>
                <div className="skeleton w-12 h-8 rounded-lg" />
              </div>
            ))}
          </div>
        ) : recentSessions.length === 0 ? (
          <EmptyState
            icon={<Presentation className="w-8 h-8 text-gray-400" />}
            description={t('dashboard.noRecentPresentations')}
            action={
              <Link href="/new-presentation" className="btn-primary btn-sm">
                {t('dashboard.startPracticing')}
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <Link
                key={session.id}
                href={`/presentations/${session.presentation_id}/result/${session.id}`}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                {/* Score Ring */}
                <ScoreRing score={session.overall_score} size="sm" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {session.presentation?.title ?? 'Presentation'}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(session.created_at, language)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDuration(session.duration)}
                    </span>
                  </div>
                </div>

                {/* Score badge */}
                <div className="text-right flex items-center gap-2">
                  <ScoreBadge score={session.overall_score} />
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-brand-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
