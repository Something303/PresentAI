import { NextRequest, NextResponse } from 'next/server';
import {
  isOpenAIConfigured,
  createGroqChatCompletion,
  AI_MODEL,
  DEFAULT_FREE_MODEL,
} from '@/lib/openai/client';
import type { EvaluateAnswerRequest, EvaluateAnswerResponse } from '@/types';

export async function POST(req: NextRequest) {
  let language = 'id';
  let answer = '';

  try {
    const body = (await req.json()) as EvaluateAnswerRequest;
    const {
      question,
      material_context = '',
      difficulty = 'medium',
      examiner = 'general_audience',
    } = body;
    answer = body.answer ?? '';
    language = body.language ?? 'id';

    const isIndo = language === 'id';
    const cleanAnswer = answer.trim();

    // Persona of the examiner grading the answer — shapes WHAT gets rewarded/penalized.
    const examinerPersona: Record<string, string> = {
      teacher:
        'You are a supportive TEACHER. Reward genuine understanding explained in the presenter\'s own words and the ability to teach the concept simply. Penalize rote memorization without comprehension.',
      lecturer:
        'You are a rigorous UNIVERSITY LECTURER. Reward theoretical depth, correct terminology, academic justification, and references. Penalize vague, unsupported, or non-academic reasoning heavily.',
      competition_judge:
        'You are a COMPETITION JUDGE. Reward originality, innovation, real-world impact, and how convincingly the presenter defends their competitive edge. Penalize generic or unremarkable answers.',
      hr_interviewer:
        'You are an HR INTERVIEWER. Weigh communication clarity, structure, confidence, and the presenter\'s personal contribution and soft skills alongside factual correctness. Penalize evasive or unstructured answers.',
      general_audience:
        'You are an engaged GENERAL-AUDIENCE member. Reward clarity, relevance, and whether a non-expert can follow the answer. Penalize jargon-heavy answers that fail to communicate.',
    };
    const personaInstruction = examinerPersona[examiner] ?? examinerPersona.general_audience;

    // Short, persona-specific tip appended to offline feedback so the examiner type still matters.
    const personaTip: Record<string, { id: string; en: string }> = {
      teacher: {
        id: 'Sebagai Guru Pembimbing, tekankan pemahaman konsep dengan kata-katamu sendiri.',
        en: 'As a Teacher, emphasize explaining the concept in your own words.',
      },
      lecturer: {
        id: 'Sebagai Dosen Penguji, perkuat dasar teori dan referensi ilmiahmu.',
        en: 'As a Lecturer, strengthen your theoretical basis and academic references.',
      },
      competition_judge: {
        id: 'Sebagai Dewan Juri, tonjolkan inovasi, dampak, dan keunggulan kompetitifmu.',
        en: 'As a Competition Judge, highlight innovation, impact, and competitive edge.',
      },
      hr_interviewer: {
        id: 'Sebagai HR Interviewer, tunjukkan kontribusi personal dan komunikasi yang terstruktur.',
        en: 'As an HR Interviewer, show your personal contribution and structured communication.',
      },
      general_audience: {
        id: 'Sebagai Audiens Umum, jaga agar jawaban jelas dan mudah dipahami orang awam.',
        en: 'As a General Audience, keep the answer clear and easy for non-experts to follow.',
      },
    };
    const tip = personaTip[examiner] ?? personaTip.general_audience;

    if (!isOpenAIConfigured) {
      const wordCount = cleanAnswer.split(/\s+/).filter(Boolean).length;
      let score = 50;
      let feedback = '';

      if (wordCount < 5) {
        score = 35;
        feedback = isIndo
          ? 'Jawaban terlalu pendek. Coba kembangkan dengan penjelasan yang lebih memadai.'
          : 'Answer is quite short. Try expanding it with a more complete explanation.';
      } else if (difficulty === 'hard') {
        score = wordCount > 30 ? 80 : 65;
        feedback = isIndo
          ? `Jawaban diterima dalam mode offline. Coba sertakan justifikasi ilmiah atau data konkret untuk pengujian tingkat sulit. ${tip.id}`
          : `Answer processed in offline mode. Try including scientific justification or concrete data for hard difficulty. ${tip.en}`;
      } else {
        score = wordCount > 20 ? 84 : 72;
        feedback = isIndo
          ? `Jawaban cukup terstruktur. Untuk penilaian akurasi berbasis fakta penuh, pastikan koneksi AI aktif. ${tip.id}`
          : `Reasonably structured answer. For full factual accuracy grading, ensure AI is connected. ${tip.en}`;
      }

      return NextResponse.json({ score, feedback } satisfies EvaluateAnswerResponse);
    }

    const gradingInstruction =
      difficulty === 'hard'
        ? 'DIFFICULTY: HARD. Apply strict academic and professional rigor. Heavily penalize answers that are scientifically inaccurate, superficial, or illogical.'
        : difficulty === 'easy'
        ? 'DIFFICULTY: EASY. Evaluate basic understanding and clarity of communication. Still penalize completely wrong or nonsensical answers.'
        : 'DIFFICULTY: MEDIUM. Grade with balanced professional standards evaluating factual correctness, practical relevance, and sound logic.';

    const targetLang = isIndo ? 'Bahasa Indonesia' : 'English';

    const prompt = `You are an expert examiner and presentation coach evaluating a presenter's response.
${personaInstruction}
${gradingInstruction}

EVALUATION RULES — grade constructively, like a fair examiner who wants the presenter to improve, not one hunting for reasons to fail them:
1. Factual & Scientific Correctness: Check whether the answer is factually accurate, relevant, and logically sound given the question and presentation context.
2. WRONG / OFF-TOPIC ANSWERS (score 20-45): Reserve this band ONLY for answers that are factually incorrect, nonsensical, contradict the material, or completely fail to engage with the question (e.g. changing the subject, refusing to answer, pure filler with no content). Do NOT use this band just because the answer omits one specific detail the question asked for.
3. ON-TOPIC BUT INCOMPLETE ANSWERS (score 55-75): The answer correctly engages with the question and is factually sound, but misses one or more specific sub-points, lacks concrete data/examples, or stays somewhat general. This is the correct band for an answer that is relevant and reasonable but not fully complete — it is NOT "evasive" just because it does not cover every single item the question listed.
4. SOLID ANSWERS (score 76-89): The answer directly addresses the question with correct reasoning and covers most of what was asked, even if not phrased perfectly or exhaustively.
5. EXCELLENT ANSWERS (score 90-100): The answer is accurate, complete, well-reasoned, and directly answers every part of the question.
6. When in doubt between two adjacent bands, choose the HIGHER one — give the presenter the benefit of the doubt for partial credit and effort.
7. LANGUAGE: You MUST write the feedback 100% in ${targetLang}, and phrase it constructively (what was good, then what to add) rather than purely critical.

Context of Presentation:
"""
${material_context.slice(0, 4000)}
"""

Examiner's Question:
"${question}"

Presenter's Answer:
"${cleanAnswer}"

Return strictly valid JSON only:
{
  "score": number,
  "feedback": "string"
}`;

    const completion = await createGroqChatCompletion({
      model: AI_MODEL || DEFAULT_FREE_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const rawContent = completion.choices[0]?.message?.content ?? '{}';
    let cleanJson = rawContent.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);
    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 50;
    const feedback = parsed.feedback || (isIndo ? 'Evaluasi selesai.' : 'Evaluation completed.');

    return NextResponse.json({ score, feedback });
  } catch (error) {
    console.error('Error in evaluate-answer:', error);
    const isIndo = language === 'id';
    return NextResponse.json({
      score: 55,
      feedback: isIndo
        ? 'Jawaban belum dapat dinilai secara penuh karena kendala koneksi evaluasi AI. Skor ini bersifat sementara dan tidak mencerminkan kualitas jawaban Anda — silakan coba kembali.'
        : 'Answer could not be fully evaluated due to AI connection issues. This score is a placeholder and does not reflect your answer\'s quality — please try again.',
    });
  }
}

