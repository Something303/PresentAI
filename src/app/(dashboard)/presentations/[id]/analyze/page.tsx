'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  mockAnalyzeMaterial,
  getMockAnalysis,
  getStoredPresentations,
} from '@/lib/mock/data';
import { getPresentationById, savePresentationAnalysis } from '@/lib/supabase/data';
import { isDemoMode } from '@/lib/config';
import { getMaterial } from '@/lib/material-storage';
import type { PresentationAnalysis, Presentation } from '@/types';
import {
  FileText, Lightbulb, HelpCircle, AlertTriangle, Sparkles,
  ChevronRight, CheckCircle, ArrowRight, Bot, Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AnalyzePage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();

  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysis, setAnalysis] = useState<PresentationAnalysis | null>(null);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [isAIAnalysis, setIsAIAnalysis] = useState(false);
  const analysisRunRef = useRef('');

  useEffect(() => {
    const runKey = `${id}:${language}`;
    if (analysisRunRef.current === runKey) return;
    analysisRunRef.current = runKey;

    // Persists the analysis result — to Supabase (RLS-scoped to this account) for real
    // users, or localStorage for demo mode (which has no real account to attach rows to).
    const persistAnalysis = async (a: PresentationAnalysis) => {
      if (isDemoMode) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`presentai_analysis_${id}`, JSON.stringify(a));
          } catch { /* ignore */ }
        }
        return;
      }
      await savePresentationAnalysis(id, {
        summary: a.summary,
        topic: a.topic,
        main_idea: a.main_idea,
        key_points: a.key_points,
        potential_questions: a.potential_questions,
        suggestions: a.suggestions,
        weak_sections: a.weak_sections,
        missing_information: a.missing_information,
      });
    };

    const run = async () => {
      setIsAnalyzing(true);
      // Real accounts read the presentation from Supabase (RLS-scoped to this user) —
      // demo mode keeps using the localStorage-backed list since there's no real account.
      const pres = isDemoMode
        ? getStoredPresentations().find((p) => p.id === id) ?? null
        : await getPresentationById(id);
      setPresentation(pres ?? null);

      try {
        let material = typeof window !== 'undefined'
          ? await getMaterial(`presentai-material-${id}`)
          : null;

        if (!material && typeof window !== 'undefined') {
          const legacyMaterial = sessionStorage.getItem(`presentai-material-${id}`);
          if (legacyMaterial) {
            try {
              material = JSON.parse(legacyMaterial);
            } catch {
              material = null;
            }
          }
        }

        // Build a rich context string from all available sources:
        // fileContent from uploaded file + title + description for better analysis
        const titleContext = pres?.title ?? '';
        const descContext = pres?.description ?? '';
        const fileContentRaw = material?.fileContent ?? '';

        // Combine: prefer real file content, augment with metadata if content is thin
        const enrichedContent = fileContentRaw.length > 100
          ? `${titleContext ? `Judul: ${titleContext}\n` : ''}${descContext ? `Deskripsi: ${descContext}\n\n` : ''}${fileContentRaw}`
          : `${titleContext ? `Judul: ${titleContext}\n` : ''}${descContext ? `Deskripsi: ${descContext}\n` : ''}${fileContentRaw}`;

        if (process.env.NODE_ENV === 'development') {
          console.log('[Analyze] fileContent length:', fileContentRaw.length, '| title:', titleContext);
        }

        // Always attempt the real API first — it uses AI when a key is configured,
        // or falls back to a smart mock on the server-side if no key is available.
        // isDemoMode should NOT gate AI analysis; it only gates Supabase-dependent features.
        if (enrichedContent.trim().length > 10) {
          try {
            const response = await fetch('/api/analyze-material', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileContent: enrichedContent,
                fileType: material?.fileType ?? 'text',
                language,
              }),
            });

            if (response.ok) {
              const result = await response.json();
              // Detect if the API used real AI (has richer/longer content)
              // The server returns { _source: 'ai' | 'mock' } when possible,
              // otherwise we heuristically check if summary references the real content.
              const fromAI = result._source === 'ai';
              setIsAIAnalysis(fromAI);

              const analysis: PresentationAnalysis = {
                id: `analysis-${id}`,
                presentation_id: id,
                summary: result.summary,
                topic: result.topic,
                main_idea: result.main_idea,
                key_points: result.key_points ?? [],
                potential_questions: result.potential_questions ?? [],
                suggestions: result.suggestions ?? [],
                weak_sections: result.weak_sections ?? [],
                missing_information: result.missing_information ?? [],
                created_at: new Date().toISOString(),
              };
              setAnalysis(analysis);
              await persistAnalysis(analysis);
            } else {
              throw new Error('API returned non-OK status');
            }
          } catch (apiError) {
            // API unavailable (e.g., network error in local dev without a server);
            // fall back to the client-side smart mock.
            console.warn('[Analyze] API call failed, using client-side mock:', apiError);
            setIsAIAnalysis(false);
            const result = await mockAnalyzeMaterial({
              language,
              fileContent: enrichedContent,
              fileName: material?.fileName ?? pres?.file_name ?? titleContext,
              fileType: material?.fileType ?? 'text',
            });
            const analysis: PresentationAnalysis = {
              id: `analysis-${id}`,
              presentation_id: id,
              summary: result.summary,
              topic: result.topic,
              main_idea: result.main_idea,
              key_points: result.key_points,
              potential_questions: result.potential_questions,
              suggestions: result.suggestions,
              weak_sections: result.weak_sections,
              missing_information: result.missing_information,
              created_at: new Date().toISOString(),
            };
            setAnalysis(analysis);
            await persistAnalysis(analysis);
          }
        } else {
          // No meaningful content extracted — use static mock
          setIsAIAnalysis(false);
          const mock = getMockAnalysis(id);
          setAnalysis(mock);
          await persistAnalysis(mock);
        }
      } catch (error) {
        console.warn('Material analysis failed; using fallback analysis.', error);
        const mock = getMockAnalysis(id);
        setAnalysis(mock);
        await persistAnalysis(mock);
      } finally {
        setIsAnalyzing(false);
      }
    };
    run();
  }, [id, language, t]);

  if (isAnalyzing) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-brand animate-pulse-slow">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('analysis.analyzing')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
            {language === 'id'
              ? 'AI sedang membaca dan menganalisis materi presentasimu...'
              : 'AI is reading and analyzing your presentation material...'}
          </p>

          {/* Animated steps */}
          <div className="mt-8 space-y-3 text-left max-w-xs mx-auto">
            {[
              language === 'id' ? 'Membaca konten file...' : 'Reading file content...',
              language === 'id' ? 'Mengidentifikasi topik utama...' : 'Identifying main topics...',
              language === 'id' ? 'Menganalisis struktur...' : 'Analyzing structure...',
              language === 'id' ? 'Membuat pertanyaan potensial...' : 'Generating potential questions...',
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-3" style={{ animationDelay: `${i * 0.5}s` }}>
                <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-red-500">{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {language === 'id' ? 'Analisis Selesai' : 'Analysis Complete'}
            </span>
            {/* AI source badge */}
            {isAIAnalysis ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                <Bot className="w-3.5 h-3.5" />
                {language === 'id' ? 'Dianalisis AI (Groq AI)' : 'AI Analyzed (Groq AI)'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                <Cpu className="w-3.5 h-3.5" />
                {language === 'id' ? 'Mode Cerdas Offline' : 'Offline Smart Mode'}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {presentation?.title ?? 'Presentation'}
          </h1>
          {analysis.topic && (
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {language === 'id' ? 'Topik:' : 'Topic:'} {analysis.topic}
            </p>
          )}
          {!isAIAnalysis && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <span>💡</span>
              {language === 'id'
                ? 'Mode cerdas offline aktif. Pastikan server dev telah di-restart setelah mengisi GROQ_API_KEY.'
                : 'Offline smart mode active. Ensure dev server was restarted after setting GROQ_API_KEY.'}
            </p>
          )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Summary */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('analysis.summary')}</h2>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{analysis.summary}</p>
            {analysis.main_idea && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('analysis.mainIdea')}
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{analysis.main_idea}</p>
              </div>
            )}
          </div>

          {/* Key Points */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('analysis.keyPoints')}</h2>
            </div>
            <ul className="space-y-2">
              {analysis.key_points.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Potential Questions */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('analysis.potentialQuestions')}</h2>
            </div>
            <ul className="space-y-2">
              {analysis.potential_questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-purple-500 font-bold text-sm flex-shrink-0">Q{i + 1}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{q}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* CTA — sticky: scrolls normally at first, then "sticks" near the top of the
              viewport as the user scrolls through the (usually taller) main content column,
              so it stays reachable without needing a second copy of the button lower down. */}
          <Link
            href={`/presentations/${id}/room`}
            className="btn-primary w-full justify-center py-3 sticky top-6 z-10"
          >
            {t('analysis.startPresentation')}
            <ChevronRight className="w-4 h-4" />
          </Link>

          {/* Suggestions */}
          <div className="card p-5 bg-brand-50 dark:bg-brand-950/30 border-brand-100 dark:border-brand-900">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-brand-500" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('analysis.suggestions')}</h2>
            </div>
            <ul className="space-y-2">
              {analysis.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weak sections */}
          {analysis.weak_sections && analysis.weak_sections.length > 0 && (
            <div className="card p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('analysis.weakSections')}</h2>
              </div>
              <ul className="space-y-1">
                {analysis.weak_sections.map((s, i) => (
                  <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-amber-500 flex-shrink-0">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
