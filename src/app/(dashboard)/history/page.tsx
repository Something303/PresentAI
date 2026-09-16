'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  UserCheck
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScoreRing, ScoreBadge } from '@/components/ui/ScoreRing';
import { getStoredSessions, getStoredPresentations } from '@/lib/mock/data';
import { getPracticeSessions } from '@/lib/supabase/data';
import { getExaminerLabel } from '@/lib/utils';
import { isDemoMode } from '@/lib/config';
import type { PracticeSession, Presentation } from '@/types';

export default function HistoryPage() {
  const { t, language } = useLanguage();
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    const load = async () => {
      // Real accounts read from Supabase (RLS-scoped to this user, already joined with its
      // presentation) — demo mode keeps the localStorage-backed list + manual enrichment.
      if (isDemoMode) {
        const list = getStoredSessions();
        const presentations = getStoredPresentations();
        const enriched = list.map((s) => {
          if (!s.presentation) {
            const found = presentations.find((p) => p.id === s.presentation_id);
            return { ...s, presentation: found };
          }
          return s;
        });
        setSessions(enriched);
      } else {
        setSessions(await getPracticeSessions());
      }
    };
    load();
  }, []);

  const filteredSessions = sessions.filter((s) => {
    const title = s.presentation?.title?.toLowerCase() || '';
    const matchesSearch = title.includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (scoreFilter === 'high') return s.overall_score >= 80;
    if (scoreFilter === 'medium') return s.overall_score >= 65 && s.overall_score < 80;
    if (scoreFilter === 'low') return s.overall_score < 65;
    return true;
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {t('history.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            {t('history.subtitle')}
          </p>
        </div>

        <Link
          href="/new-presentation"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shadow-lg shadow-blue-500/20"
        >
          {t('history.newPractice')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('history.search')}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 dark:text-zinc-400 ml-1" />
          <span className="text-xs text-gray-500 dark:text-zinc-400 hidden md:inline">{t('history.filterScore')}:</span>
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-950 p-1 rounded-xl border border-gray-200 dark:border-zinc-800 text-xs">
            <button
              onClick={() => setScoreFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                scoreFilter === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t('history.scoreAll')}
            </button>
            <button
              onClick={() => setScoreFilter('high')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                scoreFilter === 'high'
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              80+
            </button>
            <button
              onClick={() => setScoreFilter('medium')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                scoreFilter === 'medium'
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              65-79
            </button>
            <button
              onClick={() => setScoreFilter('low')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                scoreFilter === 'low'
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              &lt; 65
            </button>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-gray-400 dark:text-zinc-400">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t('history.emptyTitle')}</h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto mb-5">
            {searchQuery ? t('history.emptySearchDesc') : t('history.noHistory')}
          </p>
          <Link
            href="/new-presentation"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors"
          >
            {t('history.startNewPractice')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const minutes = Math.floor(session.duration / 60);
            const seconds = session.duration % 60;
            const dateStr = new Date(session.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={session.id}
                className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800/90 hover:border-gray-300 dark:hover:border-zinc-700 transition-all shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
              >
                <div className="flex items-start gap-4">
                  <ScoreRing score={session.overall_score} size="sm" />

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {session.presentation?.title || t('history.defaultTitle')}
                      </h3>
                      <ScoreBadge score={session.overall_score} />
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400 flex-wrap pt-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                        {dateStr}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                        {minutes}m {seconds}s
                      </span>
                      {session.presentation?.examiner && (
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                          {getExaminerLabel(session.presentation.examiner, language)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score breakdown pills */}
                <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-200 dark:border-zinc-800">
                  <div className="hidden sm:flex items-center gap-3 text-xs mr-4">
                    <div className="text-center">
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 block">{t('history.speechLabel')}</span>
                      <span className="font-mono font-semibold text-gray-700 dark:text-zinc-300">{session.speech_score}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 block">{t('history.contentLabel')}</span>
                      <span className="font-mono font-semibold text-gray-700 dark:text-zinc-300">{session.content_score}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 block">{t('history.bodyLabel')}</span>
                      <span className="font-mono font-semibold text-gray-700 dark:text-zinc-300">{session.body_language_score}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 block">Q&A</span>
                      <span className="font-mono font-semibold text-gray-700 dark:text-zinc-300">{session.qa_score}</span>
                    </div>
                  </div>

                  <Link
                    href={`/presentations/${session.presentation_id}/result?sessionId=${session.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-semibold text-gray-700 dark:text-zinc-200 transition-colors border border-gray-200 dark:border-zinc-700/60"
                  >
                    {t('history.viewResult')}
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
