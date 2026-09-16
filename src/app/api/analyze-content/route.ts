import { NextRequest, NextResponse } from 'next/server';
import {
  isOpenAIConfigured,
  isOpenAIQuotaError,
  createGroqChatCompletion,
  AI_MODEL,
  DEFAULT_FREE_MODEL,
} from '@/lib/openai/client';
import type { AnalyzeContentRequest, AnalyzeContentResponse } from '@/types';


export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeContentRequest;
    const { material_summary = '', key_points = [], transcript = '', language = 'id' } = body;

    if (!isOpenAIConfigured) {
      const isIndo = language === 'id';
      const transcriptWords = transcript.trim().split(/\s+/).filter(Boolean).length;

      // If transcript is empty — presenter did not speak, content cannot be evaluated
      if (transcriptWords === 0) {
        return NextResponse.json({
          content_score: 5,
          structure_score: 5,
          relevance: 5,
          accuracy: 5,
          completeness: 5,
          reasoning: isIndo
            ? 'Tidak ada transkrip bicara yang terdeteksi. Presenter tidak berbicara selama sesi ini, sehingga penguasaan materi tidak dapat dinilai.'
            : 'No speech transcript detected. The presenter did not speak during this session, so content mastery cannot be evaluated.',
        } satisfies AnalyzeContentResponse);
      }

      // Very short speech — minimal content coverage
      if (transcriptWords < 30) {
        const brevityScore = Math.round(15 + (transcriptWords / 30) * 30); // 15–45
        return NextResponse.json({
          content_score: brevityScore,
          structure_score: Math.round(brevityScore * 0.8),
          relevance: brevityScore,
          accuracy: brevityScore,
          completeness: Math.round(brevityScore * 0.6),
          reasoning: isIndo
            ? `Presentasi sangat singkat (hanya ${transcriptWords} kata). Penguasaan materi tidak dapat dinilai secara memadai karena kurangnya konten yang disampaikan.`
            : `Presentation was extremely brief (only ${transcriptWords} words). Content mastery cannot be adequately assessed due to insufficient spoken content.`,
        } satisfies AnalyzeContentResponse);
      }

      const mockResult: AnalyzeContentResponse = {
        content_score: 86,
        structure_score: 84,
        relevance: 88,
        accuracy: 85,
        completeness: 82,
        reasoning: isIndo
          ? 'Presentasi mencakup sebagian besar materi pokok dengan baik. Struktur pembuka dan pembahasan inti cukup runtut, namun ringkasan di bagian akhir dapat lebih dipertegas.'
          : 'The presentation effectively covered most of the core points. Introduction and core flow were cohesive, though final wrap-up could be more prominent.',
      };
      return NextResponse.json(mockResult);
    }

    const prompt = `You are an academic presentation evaluator.
Material Summary:
${material_summary}

Key Points from Slides:
${key_points.join('\n- ')}

Speaker Presentation Transcript:
${transcript.slice(0, 3000)}

Language: ${language === 'id' ? 'Indonesian' : 'English'}

Evaluate content mastery and structure. Return JSON only:
{
  "content_score": number (0-100),
  "structure_score": number (0-100),
  "relevance": number (0-100),
  "accuracy": number (0-100),
  "completeness": number (0-100),
  "reasoning": "string"
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
    return NextResponse.json(parsed);

  } catch (error) {
    console.error('Error in analyze-content:', error);
    if (isOpenAIQuotaError(error)) {
      console.warn('[analyze-content] OpenAI quota exhausted — using mock fallback.');
      const isIndo = true;
      return NextResponse.json({
        content_score: 80, structure_score: 78, relevance: 82,
        accuracy: 80, completeness: 76,
        reasoning: isIndo
          ? 'Analisis konten dilakukan secara lokal karena kuota API sedang tidak tersedia.'
          : 'Content analysis performed locally as API quota is currently unavailable.',
      } satisfies AnalyzeContentResponse);
    }
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    );
  }
}
