import { NextRequest, NextResponse } from 'next/server';
import {
  isOpenAIConfigured,
  createGroqChatCompletion,
  AI_MODEL,
  DEFAULT_FREE_MODEL,
} from '@/lib/openai/client';
import type { AnalyzeMaterialRequest, AnalyzeMaterialResponse } from '@/types';

/** Build a high quality structured response from content when AI API is unavailable */
function buildMockResponse(fileContent: string, language: string): AnalyzeMaterialResponse {
  const isIndo = language === 'id';
  const rawText = typeof fileContent === 'string' ? fileContent.trim() : '';

  // 1. Detect title line
  let detectedTitle = '';
  const judulMatch = rawText.match(/(?:^|\n)\s*(?:judul|title):\s*([^\n\r]+)/i);
  if (judulMatch?.[1] && judulMatch[1].trim().length > 2) {
    detectedTitle = judulMatch[1].trim();
  }

  // 2. Extract meaningful lines
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 15 && !/^(judul|title|deskripsi|description|topik|topic):/i.test(l));

  if (!detectedTitle && lines.length > 0) {
    const candidate = lines[0].replace(/^[#\-*0-9.]+\s*/, '').slice(0, 80);
    if (candidate.length > 3) {
      detectedTitle = candidate;
    }
  }

  const normalized = rawText.toLowerCase();

  const detectTopic = (): string => {
    if (/kecerdasan buatan|artificial intelligence|machine learning|chatgpt|llm|neural network/.test(normalized)) {
      return isIndo ? 'Kecerdasan Buatan & Pembelajaran Mesin' : 'Artificial Intelligence & Machine Learning';
    }
    if (/pemasaran digital|digital marketing|seo|brand|sosial media marketing/.test(normalized)) {
      return isIndo ? 'Strategi Pemasaran Digital' : 'Digital Marketing Strategy';
    }
    if (/media sosial|sosial media|remaja|screen time|instagram|tiktok/.test(normalized)) {
      return isIndo ? 'Dampak Media Sosial terhadap Remaja' : 'Social Media Impact on Youth';
    }
    if (/startup|bisnis|business|revenue|profit|investor|entrepreneur/.test(normalized)) {
      return isIndo ? 'Kewirausahaan & Strategi Bisnis' : 'Entrepreneurship & Business Strategy';
    }
    if (/kesehatan|health|medical|penyakit|disease|obat|treatment/.test(normalized)) {
      return isIndo ? 'Kesehatan & Ilmu Medis' : 'Health & Medical Sciences';
    }
    if (/lingkungan|environment|climate|iklim|sustainability|renewable/.test(normalized)) {
      return isIndo ? 'Lingkungan & Keberlanjutan' : 'Environment & Sustainability';
    }
    if (/pendidikan|education|kurikulum|siswa|student|belajar|learning/.test(normalized)) {
      return isIndo ? 'Pendidikan & Pembelajaran Modern' : 'Modern Education & Learning';
    }
    if (/teknologi|technology|software|programming|cloud|cyber|data|iot|smart city/.test(normalized)) {
      return isIndo ? 'Teknologi & Inovasi Digital' : 'Technology & Digital Innovation';
    }
    if (/ekonomi|economy|finance|keuangan|inflasi|pasar|market/.test(normalized)) {
      return isIndo ? 'Ekonomi & Keuangan' : 'Economics & Finance';
    }
    if (detectedTitle) {
      return detectedTitle;
    }
    return isIndo ? 'Materi Presentasi' : 'Presentation Material';
  };

  const topic = detectTopic();

  // Extract top sentences for key points
  const keyPoints: string[] = [];
  for (const line of lines.slice(0, 8)) {
    const cleanLine = line.replace(/^[#\-*0-9.]+\s*/, '').trim();
    if (cleanLine.length > 20 && cleanLine.length < 160 && !keyPoints.includes(cleanLine)) {
      keyPoints.push(cleanLine);
      if (keyPoints.length >= 4) break;
    }
  }

  if (keyPoints.length === 0) {
    keyPoints.push(
      isIndo
        ? `Pemahaman konteks dan latar belakang penting tentang ${topic.toLowerCase()}.`
        : `Understanding the essential context and background of ${topic.toLowerCase()}.`,
      isIndo
        ? `Analisis tantangan utama serta faktor penentu keberhasilan implementasi.`
        : `Analysis of core challenges and critical success factors.`,
      isIndo
        ? `Strategi dan rekomendasi tindakan terukur untuk audiens.`
        : `Actionable strategy and measurable recommendations for the audience.`
    );
  }

  const excerpt = lines.slice(0, 3).join(' ');
  const summary = isIndo
    ? `Materi ini berfokus pada "${topic}". ${excerpt ? `${excerpt.slice(0, 300)}...` : 'Membahas konsep kunci, analisis data, dan langkah strategis yang relevan.'}`
    : `This presentation focuses on "${topic}". ${excerpt ? `${excerpt.slice(0, 300)}...` : 'Covers key concepts, data analysis, and strategic steps.'}`;

  const mainIdea = lines[0] && lines[0].length > 30
    ? lines[0].slice(0, 160)
    : (isIndo
        ? `Membahas ${topic.toLowerCase()} secara komprehensif untuk memberikan wawasan dan solusi aplikatif bagi audiens.`
        : `Providing comprehensive insights and actionable solutions regarding ${topic.toLowerCase()}.`);

  return {
    topic,
    main_idea: mainIdea,
    summary,
    key_points: keyPoints,
    potential_questions: isIndo
      ? [
          `Apa argumen atau data terkuat yang mendasari kesimpulan dalam materi ${topic.toLowerCase()} ini?`,
          `Bagaimana cara Anda mengukur efektivitas solusi yang diajukan dalam presentasi ini?`,
          `Apa kendala implementasi paling kritis yang mungkin dihadapi dan bagaimana solusinya?`,
        ]
      : [
          `What is the strongest evidence or data supporting the conclusions regarding ${topic.toLowerCase()}?`,
          `How would you measure the effectiveness of the solutions proposed in this presentation?`,
          `What are the most critical implementation obstacles and how will you overcome them?`,
        ],
    suggestions: isIndo
      ? [
          'Perjelas pesan utama di awal presentasi agar audiens langsung memahami urgensi topik.',
          'Tambahkan studi kasus konkret atau data kuantitatif untuk memperkuat kredibilitas argumen.',
          'Gunakan transisi antar slide yang lebih mulus dan akhiri dengan ajakan bertindak (call-to-action) yang tegas.',
        ]
      : [
          'Clarify the main message early so the audience immediately grasps the urgency.',
          'Add concrete case studies or quantitative data to reinforce your credibility.',
          'Use smoother transitions between slides and conclude with a strong call-to-action.',
        ],
    weak_sections: isIndo
      ? ['Bagian pendukung data dan contoh implementasi nyata dapat diperdalam lagi.']
      : ['Supporting data and real-world implementation examples could be expanded.'],
    missing_information: isIndo
      ? [
          'Studi kasus pembanding atau perbandingan dengan metode alternatif.',
          'Metrik evaluasi jangka panjang untuk mengukur dampak implementasi.',
        ]
      : [
          'Comparative case studies or evaluation against alternative methods.',
          'Long-term evaluation metrics to measure implementation impact.',
        ],
    _source: 'mock' as const,
  };
}

export async function POST(req: NextRequest) {
  let fileContent = '';
  let language = 'id';

  try {
    const body = (await req.json()) as AnalyzeMaterialRequest;
    fileContent = body.fileContent ?? '';
    language = body.language ?? 'id';

    const cleanedContent = typeof fileContent === 'string'
      ? fileContent
          .replace(/^data:.*;base64,/, '')
          .replace(/\r/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
      : '';

    // If API key is not configured, directly return clean mock
    if (!isOpenAIConfigured) {
      return NextResponse.json(buildMockResponse(cleanedContent, language));
    }

    const excerpt = cleanedContent.slice(0, 10000);
    const targetLang = language === 'en' ? 'English' : 'Indonesian';
    const langRule = language === 'en'
      ? 'CRITICAL: Output EVERY SINGLE field (topic, main_idea, summary, key_points, potential_questions, suggestions, weak_sections, missing_information) 100% in ENGLISH. If the input text is in Indonesian or another language, translate and synthesize everything into fluent, natural ENGLISH.'
      : 'CRITICAL: Output EVERY SINGLE field (topic, main_idea, summary, key_points, potential_questions, suggestions, weak_sections, missing_information) 100% in BAHASA INDONESIA yang baku, profesional, dan alami.';

    const prompt = `You are an expert presentation coach and analyst. Thoroughly analyze the following presentation material and return a strict JSON response.
Target Language: ${targetLang}
${langRule}

Presentation Content:
"""
${excerpt}
"""

Instructions:
1. "topic": Specific, concise title/topic in ${targetLang} (never return generic "Presentation Topic" or "Topik Presentasi").
2. "main_idea": 1-2 powerful sentences capturing the core message in ${targetLang}.
3. "summary": A well-crafted paragraph summarizing the presentation flow and main conclusions in ${targetLang}.
4. "key_points": Array of 3 to 5 clear, insightful key points from the material in ${targetLang}.
5. "potential_questions": Array of 3 to 5 challenging questions an examiner, investor, or audience would ask in ${targetLang}.
6. "suggestions": Array of 3 actionable presentation coaching tips in ${targetLang}.
7. "weak_sections": Array of 1 to 2 areas in the slides that need improvement in ${targetLang}.
8. "missing_information": Array of 1 to 2 pieces of critical info or data missing in ${targetLang}.

Return strictly valid JSON only:
{
  "topic": "...",
  "main_idea": "...",
  "summary": "...",
  "key_points": ["..."],
  "potential_questions": ["..."],
  "suggestions": ["..."],
  "weak_sections": ["..."],
  "missing_information": ["..."]
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

    return NextResponse.json({
      ...parsed,
      _source: 'ai',
    });
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    console.warn('[analyze-material] Groq request encountered error:', err?.message || err?.code || error);

    // Fall back to clean mock response instead of returning a 500 error
    const fallback = buildMockResponse(fileContent, language);
    return NextResponse.json(fallback);
  }
}



