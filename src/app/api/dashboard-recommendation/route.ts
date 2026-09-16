import { NextRequest, NextResponse } from 'next/server';
import {
  isOpenAIConfigured,
  createGroqChatCompletion,
  AI_MODEL,
  DEFAULT_FREE_MODEL,
} from '@/lib/openai/client';

interface CategoryAverages {
  content: number;
  speech: number;
  intonation: number;
  body_language: number;
  structure: number;
  qa: number;
}

interface DashboardRecommendationRequest {
  language: 'id' | 'en';
  average_score: number;
  total_practices: number;
  category_averages: CategoryAverages;
  trend: 'improving' | 'declining' | 'stable';
}

export interface DashboardRecommendationResponse {
  recommendation: string;
  _source: 'ai' | 'fallback';
}

const FALLBACK_TEXT = {
  id: 'Terus berlatih secara rutin untuk meningkatkan kemampuan presentasimu secara bertahap!',
  en: 'Keep practicing regularly to steadily improve your presentation skills!',
};

export async function POST(req: NextRequest) {
  let language: 'id' | 'en' = 'id';

  try {
    const body = (await req.json()) as DashboardRecommendationRequest;
    language = body.language === 'en' ? 'en' : 'id';
    const { average_score = 0, total_practices = 0, category_averages, trend = 'stable' } = body;
    const isIndo = language === 'id';

    if (!isOpenAIConfigured || !category_averages) {
      return NextResponse.json({
        recommendation: FALLBACK_TEXT[language],
        _source: 'fallback',
      } satisfies DashboardRecommendationResponse);
    }

    const categoryLabels = isIndo
      ? { content: 'Penguasaan Materi', speech: 'Kejelasan Bicara', intonation: 'Intonasi & Tempo', body_language: 'Bahasa Tubuh', structure: 'Struktur Presentasi', qa: 'Tanya Jawab' }
      : { content: 'Content Mastery', speech: 'Speech Clarity', intonation: 'Intonation & Pace', body_language: 'Body Language', structure: 'Presentation Structure', qa: 'Q&A' };

    const scoresList = (Object.entries(category_averages) as [keyof CategoryAverages, number][])
      .map(([key, value]) => `- ${categoryLabels[key]}: ${Math.round(value)}/100`)
      .join('\n');

    const trendLabel = isIndo
      ? { improving: 'membaik', declining: 'menurun', stable: 'stabil' }[trend]
      : trend;

    const prompt = `You are an encouraging, expert presentation coach writing a SHORT personalized tip for a user's dashboard, based on their real practice history — not a generic message.

Average overall score across ${total_practices} practice session(s): ${Math.round(average_score)}/100
Recent trend: ${trendLabel}
Category averages:
${scoresList}

INSTRUCTIONS:
1. Identify the WEAKEST category above and give ONE concrete, actionable coaching tip to improve specifically that area.
2. If all categories are strong (all 80+), instead give a tip to push toward mastery/consistency.
3. Be warm and encouraging, never harsh — this is a dashboard greeting, not a report card.
4. Keep it SHORT: 2-3 sentences maximum.
5. Do NOT just restate the numbers back to the user — give real coaching advice.
6. Write 100% in ${isIndo ? 'Bahasa Indonesia' : 'English'}.

Return strictly valid JSON only:
{ "recommendation": "string" }`;

    const completion = await createGroqChatCompletion({
      model: AI_MODEL || DEFAULT_FREE_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });

    const rawContent = completion.choices[0]?.message?.content ?? '{}';
    let cleanJson = rawContent.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);
    const recommendation =
      typeof parsed.recommendation === 'string' && parsed.recommendation.trim()
        ? parsed.recommendation.trim()
        : FALLBACK_TEXT[language];

    return NextResponse.json({ recommendation, _source: 'ai' } satisfies DashboardRecommendationResponse);
  } catch (error) {
    console.error('Error in dashboard-recommendation:', error);
    return NextResponse.json({
      recommendation: FALLBACK_TEXT[language],
      _source: 'fallback',
    } satisfies DashboardRecommendationResponse);
  }
}
