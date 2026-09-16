import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ExaminerType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Human-readable, bilingual examiner labels — shared so every page that displays an
// examiner (History, Room, Q&A, etc.) shows the same properly-cased, translated text
// instead of raw enum values like "general_audience" with the underscore swapped for a space.
const EXAMINER_LABELS: Record<ExaminerType, { id: string; en: string }> = {
  teacher: { id: 'Guru Pembimbing', en: 'Teacher' },
  lecturer: { id: 'Dosen Penguji', en: 'Lecturer' },
  competition_judge: { id: 'Dewan Juri Lomba', en: 'Competition Judge' },
  hr_interviewer: { id: 'HR Interviewer', en: 'HR Interviewer' },
  general_audience: { id: 'Audiens Umum', en: 'General Audience' },
};

export function getExaminerLabel(examiner: ExaminerType | undefined | null, language: 'id' | 'en' = 'id'): string {
  if (!examiner || !(examiner in EXAMINER_LABELS)) {
    return EXAMINER_LABELS.general_audience[language];
  }
  return EXAMINER_LABELS[examiner][language];
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(dateString: string, language: 'id' | 'en' = 'id'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortDate(dateString: string, language: 'id' | 'en' = 'id'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

export function getGreeting(language: 'id' | 'en'): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
