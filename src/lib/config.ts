// App configuration
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY;

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// Score weights
export const SCORE_WEIGHTS = {
  content: 0.25,
  speech: 0.20,
  intonation: 0.15,
  bodyLanguage: 0.15,
  structure: 0.10,
  qa: 0.15,
} as const;

export function calculateOverallScore(scores: {
  content: number;
  speech: number;
  intonation: number;
  bodyLanguage: number;
  structure: number;
  qa: number;
}): number {
  return Math.round(
    scores.content * SCORE_WEIGHTS.content +
    scores.speech * SCORE_WEIGHTS.speech +
    scores.intonation * SCORE_WEIGHTS.intonation +
    scores.bodyLanguage * SCORE_WEIGHTS.bodyLanguage +
    scores.structure * SCORE_WEIGHTS.structure +
    scores.qa * SCORE_WEIGHTS.qa
  );
}

export function getPerformanceLevel(score: number, t: (key: string) => string): string {
  if (score >= 90) return t('scores.levels.excellent');
  if (score >= 80) return t('scores.levels.veryGood');
  if (score >= 70) return t('scores.levels.good');
  if (score >= 60) return t('scores.levels.needsImprovement');
  return t('scores.levels.beginner');
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}
