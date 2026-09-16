'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Volume2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import type { ExaminerType, Language, QASession, Difficulty } from '@/types';

interface QASectionProps {
  questions: string[];
  examiner: ExaminerType;
  materialContext: string;
  language: Language;
  onComplete: (qaResults: QASession[]) => void;
  questionMode?: 'auto' | 'custom';
  difficulty?: Difficulty;
}

export function QASection({
  questions,
  examiner,
  materialContext,
  language,
  onComplete,
  questionMode,
  difficulty = 'medium',
}: QASectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluatedAnswers, setEvaluatedAnswers] = useState<QASession[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<{ score: number; feedback: string } | null>(null);

  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechToText({ language });

  const currentQuestion = questions[currentIndex] || (language === 'id' ? 'Pertanyaan tidak ditemukan.' : 'Question not found.');

  // Sync speech transcript into input
  React.useEffect(() => {
    if (transcript) {
      setAnswerInput(transcript);
    }
  }, [transcript]);

  // Read out loud with SpeechSynthesis
  const speakQuestion = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQuestion);
      utterance.lang = language === 'id' ? 'id-ID' : 'en-US';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getExaminerBadge = (type: ExaminerType) => {
    const isIndo = language === 'id';
    switch (type) {
      case 'lecturer':
        return { label: isIndo ? 'Dosen Penguji' : 'Lecturer', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      case 'competition_judge':
        return { label: isIndo ? 'Dewan Juri Lomba' : 'Competition Judge', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'hr_interviewer':
        return { label: 'HR Interviewer', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'teacher':
        return { label: isIndo ? 'Guru Pembimbing' : 'Teacher', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      default:
        return { label: isIndo ? 'Audiens Umum' : 'General Audience', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    }
  };

  const getDifficultyBadge = (diff?: Difficulty) => {
    const isIndo = language === 'id';
    switch (diff) {
      case 'easy':
        return { label: isIndo ? 'Tingkat: Mudah' : 'Level: Easy', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'hard':
        return { label: isIndo ? 'Tingkat: Sulit' : 'Level: Hard', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
      default:
        return { label: isIndo ? 'Tingkat: Menengah' : 'Level: Medium', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    }
  };

  const examinerBadge = getExaminerBadge(examiner);
  const diffBadge = getDifficultyBadge(difficulty);

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setAnswerInput('');
      startListening();
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerInput.trim() || isSubmitting) return;

    if (isListening) {
      stopListening();
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion,
          answer: answerInput,
          material_context: materialContext,
          language,
          difficulty,
          examiner,
        }),
      });

      const data = await res.json();
      const finalScore = typeof data.score === 'number' ? data.score : 40;
      const finalFeedback = data.feedback || (language === 'id' ? 'Evaluasi jawaban selesai.' : 'Answer evaluation complete.');

      const newQaItem: QASession = {
        id: `qa-${Date.now()}-${currentIndex}`,
        session_id: 'session-temp',
        question: currentQuestion,
        answer: answerInput,
        score: finalScore,
        feedback: finalFeedback,
        order_index: currentIndex,
      };


      setCurrentFeedback({ score: newQaItem.score!, feedback: newQaItem.feedback! });
      setEvaluatedAnswers((prev) => [...prev, newQaItem]);
    } catch (err) {
      console.error('Error evaluating answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    setCurrentFeedback(null);
    setAnswerInput('');
    resetTranscript();

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finished all questions
      onComplete(evaluatedAnswers);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-6 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-white">
                {language === 'id' ? 'Sesi Tanya Jawab Interaktif' : 'Interactive Q&A Session'}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${examinerBadge.color}`}>
                {examinerBadge.label}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${diffBadge.color}`}>
                {diffBadge.label}
              </span>
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
              <span>
                {language === 'id'
                  ? `Pertanyaan ${currentIndex + 1} dari ${questions.length}`
                  : `Question ${currentIndex + 1} of ${questions.length}`}
              </span>
              {questionMode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  {questionMode === 'custom'
                    ? (language === 'id' ? 'Mode Kustom' : 'Custom Mode')
                    : (language === 'id' ? 'Mode Otomatis' : 'Auto Mode')}
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={speakQuestion}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors border border-zinc-700/60"
        >
          <Volume2 className="w-4 h-4 text-blue-400" />
          {language === 'id' ? 'Dengarkan' : 'Listen'}
        </button>
      </div>

      {/* Question Card */}
      <div className="my-6 p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 shadow-inner">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
          <p className="text-base sm:text-lg font-medium text-zinc-100 leading-relaxed">
            "{currentQuestion}"
          </p>
        </div>
      </div>

      {/* Evaluated Result Feedback if already submitted */}
      {currentFeedback ? (
        <div className="flex-1 flex flex-col justify-center animate-fadeIn p-6 rounded-2xl bg-gradient-to-br from-blue-950/20 via-zinc-900 to-zinc-950 border border-blue-500/30 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h4 className="text-sm font-semibold text-white">
                {language === 'id' ? 'Evaluasi Jawaban AI' : 'AI Answer Evaluation'}
              </h4>
            </div>
            <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
              {language === 'id' ? 'Skor' : 'Score'}: {currentFeedback.score}/100
            </div>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed mb-6">
            {currentFeedback.feedback}
          </p>

          <button
            onClick={handleNextQuestion}
            className="self-end inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
          >
            {currentIndex + 1 < questions.length
              ? (language === 'id' ? 'Pertanyaan Berikutnya' : 'Next Question')
              : (language === 'id' ? 'Selesaikan Sesi Presentasi' : 'Finish Presentation Session')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Answer Input Area */
        <div className="flex-1 flex flex-col">
          <div className="relative flex-1 mb-4">
            <textarea
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder={
                language === 'id'
                  ? 'Ketik jawaban Anda atau klik ikon mikrofon untuk menjawab secara langsung dengan suara...'
                  : 'Type your answer or click the microphone icon to answer directly with your voice...'
              }
              rows={4}
              className="w-full h-full min-h-[140px] p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />

            {isListening && (
              <div className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {language === 'id' ? 'Merekam Suara...' : 'Recording...'}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleToggleVoice}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                isListening
                  ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-blue-400" />}
              {isListening
                ? (language === 'id' ? 'Hentikan Suara' : 'Stop Voice')
                : (language === 'id' ? 'Bicara untuk Menjawab' : 'Speak to Answer')}
            </button>

            <button
              onClick={handleSubmitAnswer}
              disabled={!answerInput.trim() || isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {language === 'id' ? 'Mengevaluasi...' : 'Evaluating...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {language === 'id' ? 'Kirim Jawaban' : 'Submit Answer'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
