'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import {
  Mic, Eye, FileText, MessageSquare,
  ArrowRight, CheckCircle, Play, Upload,
  BarChart3, Award, Users,
  Presentation, Zap, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SCORE_CATEGORIES = [
  { key: 'content',     label: 'Content Mastery',         weight: 25, color: 'bg-brand-500' },
  { key: 'speech',      label: 'Speech Clarity',           weight: 20, color: 'bg-blue-500' },
  { key: 'intonation',  label: 'Intonation & Pace',        weight: 15, color: 'bg-purple-500' },
  { key: 'body',        label: 'Body Language',            weight: 15, color: 'bg-green-500' },
  { key: 'structure',   label: 'Presentation Structure',   weight: 10, color: 'bg-orange-500' },
  { key: 'qa',          label: 'Q&A',                      weight: 15, color: 'bg-pink-500' },
];

export default function LandingPage() {
  const { t, language } = useLanguage();

  const features = [
    {
      icon: <Mic className="w-6 h-6" />,
      title: t('landing.features.speech.title'),
      desc: t('landing.features.speech.desc'),
      color: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: t('landing.features.body.title'),
      desc: t('landing.features.body.desc'),
      color: 'from-green-500 to-emerald-500',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: t('landing.features.content.title'),
      desc: t('landing.features.content.desc'),
      color: 'from-brand-500 to-violet-500',
      bg: 'bg-brand-50 dark:bg-brand-950/30',
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: t('landing.features.qa.title'),
      desc: t('landing.features.qa.desc'),
      color: 'from-pink-500 to-rose-500',
      bg: 'bg-pink-50 dark:bg-pink-950/30',
    },
  ];

  const steps = [
    { num: '01', icon: <Upload className="w-6 h-6" />, title: t('landing.howItWorks.step1.title'), desc: t('landing.howItWorks.step1.desc') },
    { num: '02', icon: <Play className="w-6 h-6" />,   title: t('landing.howItWorks.step2.title'), desc: t('landing.howItWorks.step2.desc') },
    { num: '03', icon: <BarChart3 className="w-6 h-6" />, title: t('landing.howItWorks.step3.title'), desc: t('landing.howItWorks.step3.desc') },
    { num: '04', icon: <Award className="w-6 h-6" />,  title: t('landing.howItWorks.step4.title'), desc: t('landing.howItWorks.step4.desc') },
  ];

  // Verifiable product facts (feature counts straight from the app itself) — not usage
  // claims, since this project has no real user base to report numbers for.
  const stats = [
    { value: '6',         label: language === 'id' ? 'Dimensi Penilaian' : 'Scoring Dimensions', icon: <BarChart3 className="w-5 h-5" /> },
    { value: '5',         label: language === 'id' ? 'Persona Penguji' : 'Examiner Personas', icon: <Users className="w-5 h-5" /> },
    { value: '3',         label: language === 'id' ? 'Tingkat Kesulitan' : 'Difficulty Levels', icon: <Zap className="w-5 h-5" /> },
    { value: 'Real-time', label: language === 'id' ? 'Analisis AI' : 'AI Analysis', icon: <Shield className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <LandingNavbar />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-brand-900 to-purple-950" />
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #6366f1 0%, transparent 50%),
                              radial-gradient(circle at 75% 75%, #a855f7 0%, transparent 50%)`
          }}
        />
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-500/15 blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-sm font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              {language === 'id' ? 'Platform AI #1 untuk Latihan Presentasi' : 'AI-Powered Presentation Training'}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6 text-balance">
              {t('landing.hero.title')}
            </h1>

            <p className="text-lg text-brand-200 leading-relaxed mb-8 max-w-lg">
              {t('landing.hero.subtitle')}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary btn-lg group">
                {t('landing.hero.cta')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href="#how-it-works" className="btn-secondary btn-lg text-gray-200 bg-white/10 border-white/20 hover:bg-white/20">
                {t('landing.hero.secondary')}
              </a>
            </div>

            {/* Mini stats */}
            <div className="flex flex-wrap gap-6 mt-10">
              {[
                { label: language === 'id' ? 'Analisis bicara & bahasa tubuh' : 'Speech & body analysis', icon: <CheckCircle className="w-4 h-4 text-green-400" /> },
                { label: language === 'id' ? 'Feedback AI personal' : 'Personal AI feedback', icon: <CheckCircle className="w-4 h-4 text-green-400" /> },
                { label: language === 'id' ? 'Pantau progres' : 'Track progress', icon: <CheckCircle className="w-4 h-4 text-green-400" /> },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-brand-200">
                  {item.icon}
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Hero Visual */}
          <div className="hidden lg:block animate-float">
            <div className="relative">
              {/* Main card */}
              <div className="glass rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                    <Presentation className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">AI Analysis</p>
                    <p className="text-brand-300 text-xs">Real-time feedback</p>
                  </div>
                  <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                </div>

                {/* Score bars */}
                <div className="space-y-3">
                  {[
                    { label: 'Speech Clarity', score: 88, color: 'bg-blue-400' },
                    { label: 'Body Language', score: 82, color: 'bg-green-400' },
                    { label: 'Content', score: 91, color: 'bg-brand-400' },
                    { label: 'Q&A', score: 79, color: 'bg-pink-400' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs text-white/80 mb-1">
                        <span>{item.label}</span>
                        <span className="font-semibold">{item.score}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10">
                        <div
                          className={cn('h-full rounded-full', item.color)}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-white/60 text-xs">Overall Score</span>
                  <span className="text-2xl font-bold text-white">85</span>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 glass rounded-2xl px-4 py-2.5 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400 record-pulse" />
                  <span className="text-white text-xs font-medium">Recording</span>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 glass rounded-2xl px-4 py-2.5 shadow-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-white text-xs font-medium">AI Examiner Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center pt-2">
            <div className="w-1 h-3 rounded-full bg-white/50" />
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────── */}
      <section className="py-16 bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.value} className="text-center">
              <div className="flex justify-center mb-2 text-brand-500">{stat.icon}</div>
              <div className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section id="features" className="section">
        <div className="container-narrow">
          <div className="text-center mb-14">
            <div className="badge-brand inline-flex mb-4">{t('landing.features.title')}</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {t('landing.features.subtitle')}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={cn('card-hover p-6', feature.bg)}
              >
                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white mb-4 shadow-sm', feature.color)}>
                  {feature.icon}
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section id="how-it-works" className="section bg-white dark:bg-gray-900">
        <div className="container-narrow">
          <div className="text-center mb-14">
            <div className="badge-brand inline-flex mb-4">{t('landing.howItWorks.title')}</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {t('landing.howItWorks.subtitle')}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-8 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-brand-200 to-brand-400 dark:from-brand-800 dark:to-brand-600" style={{ left: '12.5%', right: '12.5%' }} />

            {steps.map((step, idx) => (
              <div key={step.num} className="flex flex-col items-center text-center relative">
                <div className="relative mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-brand mb-2">
                    {step.icon}
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white dark:bg-gray-900 border-2 border-brand-400 text-brand-600 text-xs font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCORING ─────────────────────────────────────────────── */}
      <section id="scoring" className="section">
        <div className="container-narrow">
          <div className="text-center mb-14">
            <div className="badge-brand inline-flex mb-4">{t('landing.scoring.title')}</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {t('landing.scoring.subtitle')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              {SCORE_CATEGORIES.map((cat) => (
                <div key={cat.key} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {language === 'id' ? {
                        content: 'Penguasaan Materi',
                        speech: 'Kejelasan Bicara',
                        intonation: 'Intonasi & Tempo',
                        body: 'Bahasa Tubuh',
                        structure: 'Struktur Presentasi',
                        qa: 'Tanya Jawab',
                      }[cat.key] : cat.label}
                    </span>
                    <span className="badge-brand">{cat.weight}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div
                      className={cn('h-full rounded-full', cat.color)}
                      style={{ width: `${cat.weight * 4}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Score visual */}
            <div className="flex justify-center">
              <div className="card p-8 text-center max-w-xs">
                <div className="w-40 h-40 mx-auto relative mb-4">
                  <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                    <circle cx="80" cy="80" r="60" fill="none" stroke="currentColor" strokeWidth="12" className="text-gray-100 dark:text-gray-800" />
                    <circle cx="80" cy="80" r="60" fill="none" stroke="url(#grad)" strokeWidth="12" strokeLinecap="round"
                      strokeDasharray="377" strokeDashoffset="60" />
                    <defs>
                      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black gradient-text">100</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Total Score</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'id'
                    ? 'Skor akhir merupakan rata-rata tertimbang dari semua kategori'
                    : 'Final score is a weighted average of all categories'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="section bg-gradient-to-br from-brand-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 60%), radial-gradient(circle at 80% 50%, white 0%, transparent 60%)'
        }} />
        <div className="relative container-narrow text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('landing.cta.title')}
          </h2>
          <p className="text-brand-200 text-lg mb-8 max-w-xl mx-auto">
            {t('landing.cta.subtitle')}
          </p>
          <Link href="/register" className="btn-lg bg-white text-brand-700 hover:bg-gray-50 shadow-lg px-8 py-3.5 rounded-xl font-bold inline-flex items-center gap-2 transition-all group">
            {t('landing.cta.button')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Presentation className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">PresentAI</span>
          </div>
          <p className="text-sm">
            © 2025 PresentAI. Practice. Present. Improve.
          </p>
        </div>
      </footer>
    </div>
  );
}
