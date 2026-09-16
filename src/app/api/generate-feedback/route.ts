import { NextRequest, NextResponse } from 'next/server';
import {
  isOpenAIConfigured,
  createGroqChatCompletion,
  AI_MODEL,
  DEFAULT_FREE_MODEL,
} from '@/lib/openai/client';

import type { GenerateFeedbackRequest, GenerateFeedbackResponse } from '@/types';

function mockGenerateFeedbackFallback(
  body: GenerateFeedbackRequest,
  language: string,
): GenerateFeedbackResponse {
  const isIndo = language === 'id';
  const fillerCount = body.speech_data?.filler_words ?? 0;
  const wpm = body.speech_data?.words_per_minute ?? 125;
  const eyeScore = body.body_data?.eye_contact_score ?? body.scores?.body_language ?? 85;
  const postureScore = body.body_data?.posture_score ?? body.scores?.body_language ?? 85;
  const contentScore = body.scores?.content ?? 80;
  const qaScore = body.scores?.qa ?? 80;

  const strengths: string[] = [];
  const improvements: string[] = [];
  const recommendations: string[] = [];

  if (isIndo) {
    if (eyeScore >= 75) {
      strengths.push(`Kontak mata dengan kamera sangat konsisten (${eyeScore}%), membangun koneksi yang meyakinkan.`);
    } else {
      strengths.push('Struktur alur materi terorganisir dengan runtut dari pembuka hingga penutup.');
    }
    if (wpm >= 110 && wpm <= 160) {
      strengths.push(`Tempo berbicara teratur pada ${wpm} kata per menit, berada dalam rentang ideal audiens.`);
    } else {
      strengths.push('Artikulasi dan intonasi cukup stabil dalam menyampaikan poin-poin utama presentasi.');
    }
    if (qaScore >= 75) {
      strengths.push('Kemampuan merespons pertanyaan evaluasi menunjukkan penguasaan materi yang baik.');
    } else {
      strengths.push('Sikap presentasi percaya diri dengan ketenangan yang terjaga.');
    }
    if (fillerCount > 0) {
      improvements.push(`Kurangi kata jeda/filler (${fillerCount} kata pengisi terdeteksi) seperti "eee", "anu", "kayak".`);
    } else {
      improvements.push('Pertahankan kebiasaan vokal bersih tanpa kata pengisi (filler words).');
    }
    if (eyeScore < 75) {
      improvements.push(`Tingkatkan kontak pandangan ke lensa kamera (saat ini ${eyeScore}%) agar audiens merasa lebih terlibat.`);
    } else if (postureScore < 75) {
      improvements.push('Pertahankan posisi tegap di tengah kamera untuk menghindari kesan condong ke samping.');
    } else {
      improvements.push('Eksplorasi variasi nada suara (infleksi vokal) untuk memberikan penekanan emosional pada poin kunci.');
    }
    if (contentScore < 75) {
      improvements.push('Perdalam penjelasan argumen dengan contoh konkret atau data pendukung pada slide utama.');
    } else {
      improvements.push('Perhalus transisi narasi antar-slide dengan jeda hening singkat 1-2 detik.');
    }
    recommendations.push('Latih jeda diam (silent pause) 1-2 detik sebelum berganti topik slide alih-alih menggunakan kata pengisi.');
    recommendations.push(
      eyeScore < 75
        ? 'Tempatkan kamera setara dengan level mata dan tatap langsung lensa saat menyampaikan poin kesimpulan.'
        : 'Gunakan gestur tangan terbuka secara natural untuk memperkuat poin data dan perbandingan ide.'
    );
    recommendations.push('Rekam latihan mandiri selama 2 menit dan evaluasi kembali kecepatan tempo serta artikulasi.');
  } else {
    if (eyeScore >= 75) {
      strengths.push(`Strong eye contact consistency (${eyeScore}%), establishing an engaging presence with the audience.`);
    } else {
      strengths.push('Well-structured narrative flow transitioning smoothly across slide sections.');
    }
    if (wpm >= 110 && wpm <= 160) {
      strengths.push(`Balanced speech cadence at ${wpm} words per minute, within the optimal listener range.`);
    } else {
      strengths.push('Clear articulation and steady tone delivering the primary concepts.');
    }
    if (qaScore >= 75) {
      strengths.push('Responsive handling in the Q&A segment demonstrating solid subject matter mastery.');
    } else {
      strengths.push('Confident composure maintained throughout the presentation session.');
    }
    if (fillerCount > 0) {
      improvements.push(`Minimize filler word reliance (${fillerCount} filler pause(s) detected during speech).`);
    } else {
      improvements.push('Maintain clean vocal delivery without relying on filler pauses.');
    }
    if (eyeScore < 75) {
      improvements.push(`Direct your gaze towards the camera lens (currently ${eyeScore}%) for better audience connection.`);
    } else {
      improvements.push('Introduce more vocal inflection variety to highlight critical summary takeaways.');
    }
    if (contentScore < 75) {
      improvements.push('Provide deeper concrete evidence and case examples to reinforce the slide thesis.');
    } else {
      improvements.push('Use deliberate 1-second silence intervals between slide transitions.');
    }
    recommendations.push('Practice deliberate 1-second silent pauses between topics rather than vocalized filler pauses.');
    recommendations.push('Ensure the camera is at eye level to maximize confident gaze alignment.');
    recommendations.push('Review recorded rehearsals to fine-tune pacing and body alignment.');
  }

  return {
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    recommendations: recommendations.slice(0, 3),
  };
}

export async function POST(req: NextRequest) {
  let language = 'id';
  let body: GenerateFeedbackRequest = {
    scores: {
      overall: 80, content: 80, speech: 80, intonation: 80,
      body_language: 80, structure: 80, qa: 80,
    },
    language: 'id',
  };

  try {
    body = (await req.json()) as GenerateFeedbackRequest;
    const { scores, speech_data, body_data, qa_sessions, transcript, presentation_title, material_summary } = body;
    language = body.language ?? 'id';

    if (!isOpenAIConfigured) {
      return NextResponse.json(mockGenerateFeedbackFallback(body, language));
    }

    const langInstruction = language === 'id'
      ? 'Respond ENTIRELY in Indonesian (Bahasa Indonesia yang profesional, hangat, dan konstruktif).'
      : 'Respond ENTIRELY in English (professional, warm, and actionable tone).';

    const prompt = `You are a world-class executive communication and presentation coach evaluating a real speech session.
Here are the actual session details and empirical metrics:
- Presentation Title: "${presentation_title || 'Untitled Presentation'}"
- Material Summary: "${material_summary || 'N/A'}"
- User Speech Transcript: "${transcript || '[Presenter did not speak / no voice transcript recorded]'}"
- Scores (out of 100):
  * Overall: ${scores.overall}
  * Material Mastery (Content): ${scores.content}
  * Speech & Clarity: ${scores.speech}
  * Intonation & Pacing: ${scores.intonation}
  * Body Language (CV Tracking): ${scores.body_language}
  * Structure: ${scores.structure}
  * Q&A Response: ${scores.qa}
- Speech Diagnostics:
  * Speed: ${speech_data?.words_per_minute ?? 0} WPM
  * Filler Words: ${speech_data?.filler_words ?? 0} count (${speech_data?.filler_word_list?.join(', ') || 'none'})
- Body Language Diagnostics:
  * Eye Contact Score: ${body_data?.eye_contact_score ?? scores.body_language}%
  * Posture & Alignment: ${body_data?.posture_score ?? scores.body_language}%
- Q&A Transcript & Evaluation:
  ${JSON.stringify(qa_sessions ?? [])}

LANGUAGE: ${langInstruction}

CRITICAL INSTRUCTIONS:
1. "strengths": 3 concise bullet points of genuine strengths based on what the presenter actually discussed.
2. "improvements": 3 concise bullet points. If citing filler words, use EXACTLY ${speech_data?.filler_words ?? 0} (do not invent numbers). If citing eye contact/posture, use actual scores.
3. "recommendations": 3 specific, highly practical action recommendations for the next rehearsal.

Return valid JSON ONLY (no text outside the JSON):
{
  "strengths": ["string", "string", "string"],
  "improvements": ["string", "string", "string"],
  "recommendations": ["string", "string", "string"]
}`;

    const completion = await createGroqChatCompletion({
      model: AI_MODEL || DEFAULT_FREE_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const rawContent = completion.choices[0]?.message?.content ?? '{}';
    let cleanJson = rawContent.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);
    if (
      Array.isArray(parsed.strengths) &&
      Array.isArray(parsed.improvements) &&
      Array.isArray(parsed.recommendations) &&
      parsed.strengths.length > 0
    ) {
      return NextResponse.json(parsed);
    }

    return NextResponse.json(mockGenerateFeedbackFallback(body, language));
  } catch (error) {
    console.error('Error in generate-feedback API:', error);
    return NextResponse.json(mockGenerateFeedbackFallback(body, language));
  }
}
