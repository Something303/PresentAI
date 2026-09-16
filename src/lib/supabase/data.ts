'use client';

// Real, per-user-isolated data layer backed by Supabase (with Row Level Security already
// configured in supabase/migrations/001_initial.sql — every table restricts reads/writes to
// auth.uid() = user_id, either directly or via a join back to the owning presentation/session).
//
// This replaces the old lib/mock/data.ts localStorage functions for real application data.
// localStorage is scoped to the BROWSER, not the logged-in account — so switching Supabase
// accounts on the same browser previously showed the same "history" to every account. These
// functions route through Supabase instead, so each account only ever sees its own rows.
//
// NOTE: the `presentations` table (see the SQL migration) does not have `question_count_mode`
// or `custom_question_count` columns. Adding them requires a database migration we can't run
// from here (no direct Postgres connection available in this project) — until that migration
// is added, those two fields are not persisted and presentations always fall back to their
// default ('auto' / 3) after a reload. This is a known, disclosed gap, not a data leak.

import { createClient } from './client';
import type {
  Presentation,
  PracticeSession,
  PresentationAnalysis,
  QASession,
  AIFeedback,
} from '@/types';

// ============================================================
// PRESENTATIONS
// ============================================================

export async function getPresentations(): Promise<Presentation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('presentations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getPresentations error:', error);
    return [];
  }
  return (data ?? []) as Presentation[];
}

export async function getPresentationById(id: string): Promise<Presentation | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('presentations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('getPresentationById error:', error);
    return null;
  }
  return data as Presentation | null;
}

export async function createPresentation(
  input: Omit<Presentation, 'id' | 'user_id' | 'created_at'>
): Promise<Presentation> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('presentations')
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description ?? null,
      file_url: input.file_url ?? null,
      file_name: input.file_name ?? null,
      language: input.language,
      duration: input.duration ?? null,
      examiner: input.examiner,
      difficulty: input.difficulty,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create presentation');
  }
  return data as Presentation;
}

// ============================================================
// PRACTICE SESSIONS
// ============================================================

export async function getPracticeSessions(): Promise<PracticeSession[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*, presentation:presentations(*)')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getPracticeSessions error:', error);
    return [];
  }
  return (data ?? []) as unknown as PracticeSession[];
}

export async function getPracticeSessionById(id: string): Promise<PracticeSession | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*, presentation:presentations(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('getPracticeSessionById error:', error);
    return null;
  }
  return data as unknown as PracticeSession | null;
}

export interface CreatePracticeSessionInput {
  presentation_id: string;
  duration: number;
  transcript?: string;
  overall_score: number;
  content_score: number;
  speech_score: number;
  intonation_score: number;
  body_language_score: number;
  structure_score: number;
  qa_score: number;
}

export type CreatableQaItem = Pick<QASession, 'question' | 'answer' | 'score' | 'feedback' | 'order_index'>;

export async function createPracticeSession(
  input: CreatePracticeSessionInput,
  qaResults: CreatableQaItem[] = []
): Promise<PracticeSession> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('practice_sessions')
    .insert({ ...input, user_id: user.id })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to save practice session');
  }

  const session = data as PracticeSession;

  if (qaResults.length > 0) {
    const { error: qaError } = await supabase.from('qa_sessions').insert(
      qaResults.map((qa) => ({
        session_id: session.id,
        question: qa.question,
        answer: qa.answer ?? null,
        score: qa.score ?? null,
        feedback: qa.feedback ?? null,
        order_index: qa.order_index,
      }))
    );
    if (qaError) console.error('Failed to save Q&A sessions:', qaError);
  }

  return session;
}

export async function getQaSessionsForSession(sessionId: string): Promise<QASession[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('qa_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: true });
  if (error) {
    console.error('getQaSessionsForSession error:', error);
    return [];
  }
  return (data ?? []) as QASession[];
}

// ============================================================
// PRESENTATION ANALYSIS
// ============================================================

export async function getPresentationAnalysis(presentationId: string): Promise<PresentationAnalysis | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('presentation_analysis')
    .select('*')
    .eq('presentation_id', presentationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('getPresentationAnalysis error:', error);
    return null;
  }
  return data as PresentationAnalysis | null;
}

export async function savePresentationAnalysis(
  presentationId: string,
  analysis: Omit<PresentationAnalysis, 'id' | 'presentation_id' | 'created_at'>
): Promise<PresentationAnalysis | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('presentation_analysis')
    .insert({
      presentation_id: presentationId,
      summary: analysis.summary,
      topic: analysis.topic ?? null,
      main_idea: analysis.main_idea ?? null,
      key_points: analysis.key_points ?? [],
      potential_questions: analysis.potential_questions ?? [],
      suggestions: analysis.suggestions ?? [],
      weak_sections: analysis.weak_sections ?? [],
      missing_information: analysis.missing_information ?? [],
    })
    .select('*')
    .single();

  if (error) {
    console.error('savePresentationAnalysis error:', error);
    return null;
  }
  return data as PresentationAnalysis;
}

// ============================================================
// AI FEEDBACK
// ============================================================

export async function getAiFeedback(sessionId: string): Promise<AIFeedback | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ai_feedback')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) {
    console.error('getAiFeedback error:', error);
    return null;
  }
  return data as AIFeedback | null;
}

export async function saveAiFeedback(
  sessionId: string,
  feedback: { strengths: string[]; improvements: string[]; recommendations: string[] }
): Promise<AIFeedback | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ai_feedback')
    .insert({
      session_id: sessionId,
      strengths: feedback.strengths,
      improvements: feedback.improvements,
      recommendations: feedback.recommendations,
    })
    .select('*')
    .single();
  if (error) {
    console.error('saveAiFeedback error:', error);
    return null;
  }
  return data as AIFeedback;
}
