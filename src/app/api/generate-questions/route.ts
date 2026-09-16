import { NextRequest, NextResponse } from 'next/server';
import {
  isOpenAIConfigured,
  createGroqChatCompletion,
  AI_MODEL,
  DEFAULT_FREE_MODEL,
} from '@/lib/openai/client';
import type { GenerateQuestionsRequest, GenerateQuestionsResponse } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateQuestionsRequest;
    const {
      presentation_title = '',
      material_summary = '',
      key_points = [],
      difficulty = 'medium',
      examiner = 'general_audience',
      language = 'id',
      question_count = 3,
    } = body;

    const count = Math.max(1, Math.min(10, Number(question_count) || 3));
    const isIndo = language === 'id';
    const topicLabel = presentation_title ? `materi "${presentation_title}"` : 'materi presentasi Anda';
    const topicLabelEn = presentation_title ? `"${presentation_title}"` : 'your presentation material';

    // Context & difficulty aware fallback question generator
    const generateFallbackQuestions = (): string[] => {
      let pool: string[] = [];

      if (difficulty === 'hard') {
        // HARD: Critical stress-testing, risk analysis, vulnerability and edge-cases
        pool = isIndo
          ? [
              `Jika hipotesis atau asumsi fundamental dalam ${topicLabel} ternyata meleset di lapangan, apa skenario mitigasi terburuk Anda?`,
              `Celah metodologis atau kelemahan teknis apa yang paling rentan dikritisi dari solusi dalam ${topicLabel} ini?`,
              `Bagaimana strategi Anda menghadapi resistensi pasar atau regulasi ketat yang dapat menghambat adopsi ${topicLabel}?`,
              `Bagaimana Anda membuktikan bahwa solusi dalam ${topicLabel} ini memiliki rasio efisiensi biaya (cost-effectiveness) yang layak secara jangka panjang?`,
              `Jika terdapat kegagalan implementasi pada tahap awal proyek ${topicLabel}, metrik apa yang menjadi indikator kegagalan tersebut?`,
              `Bagaimana Anda mengantisipasi jika kompetitor besar dengan modal jauh lebih kuat mengadopsi dan meniru ide ${topicLabel} Anda?`,
              `Bagian mana dari data pendukung ${topicLabel} yang memiliki tingkat margin of error tertinggi dan bagaimana Anda memvalidasinya?`,
              `Bagaimana rencana kontinjensi Anda jika pemangku kepentingan utama menarik dukungan dari inisiatif ${topicLabel} ini?`,
              `Apa kompromi atau trade-off paling berisiko yang terpaksa Anda ambil saat menyusun strategi ${topicLabel} ini?`,
              `Bagaimana sistem Anda dalam ${topicLabel} menjamin keandalan saat menghadapi beban operasional ekstrem yang tidak terduga?`,
            ]
          : [
              `If the fundamental assumptions behind ${topicLabelEn} prove inaccurate in practice, what is your worst-case mitigation strategy?`,
              `What is the most vulnerable methodological flaw or technical limitation in ${topicLabelEn} that skeptics would challenge?`,
              `How will you navigate heavy regulatory constraints or market resistance that could stall adoption of ${topicLabelEn}?`,
              `How do you prove that the cost-to-benefit ratio of ${topicLabelEn} remains sustainable over the long term?`,
              `What early failure metrics will warn you that the implementation of ${topicLabelEn} is underperforming?`,
              `How will you defend your position if a well-funded competitor attempts to duplicate the core concepts of ${topicLabelEn}?`,
              `Which dataset or assumption in ${topicLabelEn} carries the highest margin of error, and how did you verify it?`,
              `What is your contingency plan if key decision-makers withdraw support for ${topicLabelEn}?`,
              `What was the most critical trade-off you were forced to accept when designing ${topicLabelEn}?`,
              `How does the framework in ${topicLabelEn} guarantee stability when facing unprecedented operational strain?`,
            ];
      } else if (difficulty === 'easy') {
        // EASY: Foundational understanding, core motivation, key takeaways, and simple explanations
        pool = isIndo
          ? [
              `Bisa jelaskan kembali konsep paling mendasar dari ${topicLabel} dengan bahasa yang paling sederhana dan mudah dipahami?`,
              `Apa motivasi atau latar belakang awal yang mendorong Anda untuk mengangkat topik ${topicLabel} ini?`,
              `Apa pesan atau manfaat paling langsung yang ingin Anda sampaikan kepada audiens melalui presentasi ${topicLabel}?`,
              `Bagaimana Anda merangkum ide pokok dari ${topicLabel} ini dalam 2 atau 3 poin ringkas?`,
              `Siapa kelompok audiens atau pengguna yang paling mudah dan cepat merasakan manfaat dari ${topicLabel} ini?`,
              `Bagian mana dari presentasi ${topicLabel} ini yang menurut Anda paling menarik untuk diketahui oleh orang awam?`,
              `Apa satu hal terpenting yang Anda harapkan audiens ingat setelah mendengarkan paparan ${topicLabel} ini?`,
              `Langkah awal apa yang paling sederhana bagi seseorang yang ingin mulai mengenal ${topicLabel} lebih dalam?`,
              `Bagaimana ${topicLabel} ini dapat membantu menyelesaikan kendala sehari-hari yang sering ditemui?`,
              `Apa kesimpulan utama yang dapat ditarik dari pembahasan ${topicLabel} yang telah Anda sampaikan?`,
            ]
          : [
              `Could you explain the most fundamental concept of ${topicLabelEn} in simple, accessible terms?`,
              `What initial motivation or background inspired you to present on ${topicLabelEn}?`,
              `What is the most direct benefit or takeaway you want the audience to gain from ${topicLabelEn}?`,
              `How would you summarize the core message of ${topicLabelEn} in two or three key points?`,
              `Who in the audience will immediately benefit the most from the ideas in ${topicLabelEn}?`,
              `Which section of your presentation on ${topicLabelEn} is the most engaging for general listeners?`,
              `What single core message do you hope the audience takes away from ${topicLabelEn}?`,
              `What is the simplest first step for someone who wants to learn more about ${topicLabelEn}?`,
              `How does ${topicLabelEn} address common everyday challenges?`,
              `What is the primary conclusion of your presentation on ${topicLabelEn}?`,
            ];
      } else {
        // MEDIUM: Practical application, validation methods, workflows, and performance metrics
        pool = isIndo
          ? [
              `Bagaimana Anda memvalidasi keakuratan data, metodologi, dan argumen utama dalam ${topicLabel}?`,
              `Jika konsep dalam ${topicLabel} ini diterapkan dalam situasi nyata, kendala operasional apa yang paling mungkin muncul?`,
              `Apa keunggulan pendekatan dalam ${topicLabel} dibandingkan metode atau alternatif yang sudah ada sebelumnya?`,
              `Bagaimana Anda mengukur efektivitas dan keberhasilan dari implementasi materi ${topicLabel} ini?`,
              `Bisa jelaskan kembali kesimpulan esensial dan ajakan tindak lanjut dari presentasi ${topicLabel} Anda?`,
              `Tantangan teknis terbesar apa yang Anda hadapi saat merumuskan alur kerja dalam ${topicLabel}?`,
              `Bagaimana tahapan uji coba atau validasi nyata yang direncanakan untuk membuktikan konsep ${topicLabel}?`,
              `Bagaimana Anda membagi alur implementasi ${topicLabel} agar dapat dieksekusi dengan efisien?`,
              `Metrik keberhasilan utama apa yang paling krusial untuk dipantau secara berkala dalam ${topicLabel}?`,
              `Bagaimana rencana pengembangan atau tindak lanjut jangka menengah dari inisiatif ${topicLabel} ini?`,
            ]
          : [
              `How do you validate the accuracy of data, methodology, and key arguments presented in ${topicLabelEn}?`,
              `When applying the concepts of ${topicLabelEn} in real scenarios, what operational hurdles are most probable?`,
              `What is the primary advantage of your approach in ${topicLabelEn} compared to existing alternatives?`,
              `How do you measure the practical effectiveness and progress of implementing ${topicLabelEn}?`,
              `Could you summarize the essential conclusions and recommended next steps for ${topicLabelEn}?`,
              `What was the most significant challenge encountered while establishing the workflow for ${topicLabelEn}?`,
              `What validation or testing milestones are planned to substantiate the ideas in ${topicLabelEn}?`,
              `How would you structure the execution phases of ${topicLabelEn} to ensure maximum efficiency?`,
              `Which key performance indicators will be most critical to monitor throughout ${topicLabelEn}?`,
              `What is the medium-term development roadmap for the initiative outlined in ${topicLabelEn}?`,
            ];
      }

      // Examiner-specific questions — persona changes WHAT gets asked, regardless of difficulty.
      const getExaminerPool = (): string[] => {
        if (isIndo) {
          switch (examiner) {
            case 'teacher':
              return [
                `Coba ajarkan ulang inti ${topicLabel} seolah kepada teman yang belum paham sama sekali.`,
                `Bagian mana dari ${topicLabel} yang paling sering disalahpahami, dan bagaimana Anda menjelaskannya?`,
                `Contoh sehari-hari apa yang bisa membantu orang memahami ${topicLabel}?`,
                `Bagaimana Anda memastikan audiens benar-benar paham ${topicLabel}, bukan sekadar menghafal?`,
                `Pelajaran atau nilai penting apa yang bisa dipetik dari ${topicLabel}?`,
              ];
            case 'lecturer':
              return [
                `Landasan teori atau referensi ilmiah apa yang mendasari ${topicLabel}?`,
                `Bagaimana Anda mempertanggungjawabkan metodologi dalam ${topicLabel} secara akademis?`,
                `Apa keterbatasan keilmuan dari analisis dalam ${topicLabel}?`,
                `Bagaimana ${topicLabel} berkontribusi terhadap kajian atau literatur yang sudah ada?`,
                `Bagaimana Anda memvalidasi klaim utama dalam ${topicLabel} secara empiris?`,
              ];
            case 'competition_judge':
              return [
                `Apa yang membuat ${topicLabel} lebih orisinal dan unggul dibanding karya pesaing?`,
                `Seberapa besar dampak nyata yang bisa dihasilkan ${topicLabel}?`,
                `Apa inovasi utama dalam ${topicLabel} yang layak diapresiasi juri?`,
                `Bagaimana skalabilitas dan keberlanjutan dari ${topicLabel}?`,
                `Mengapa juri harus memilih ${topicLabel} dibanding finalis lain?`,
              ];
            case 'hr_interviewer':
              return [
                `Apa kontribusi personal Anda secara spesifik dalam ${topicLabel}?`,
                `Ceritakan tantangan tersulit saat mengerjakan ${topicLabel} dan bagaimana Anda mengatasinya.`,
                `Bagaimana Anda bekerja sama dengan tim dalam mewujudkan ${topicLabel}?`,
                `Jika bisa mengulang ${topicLabel}, apa yang akan Anda lakukan berbeda?`,
                `Bagaimana ${topicLabel} menunjukkan kesiapan Anda untuk peran yang dituju?`,
              ];
            default: // general_audience
              return [
                `Bisa jelaskan ${topicLabel} dengan bahasa yang mudah dipahami orang awam?`,
                `Apa manfaat langsung ${topicLabel} bagi orang seperti saya?`,
                `Bagian mana dari ${topicLabel} yang paling relevan dengan kehidupan sehari-hari?`,
                `Mengapa audiens umum perlu peduli dengan ${topicLabel}?`,
                `Bagaimana Anda meyakinkan orang yang skeptis terhadap ${topicLabel}?`,
              ];
          }
        }
        switch (examiner) {
          case 'teacher':
            return [
              `Re-teach the core of ${topicLabelEn} as if to a friend who has never heard of it.`,
              `Which part of ${topicLabelEn} is most often misunderstood, and how would you explain it?`,
              `What everyday example would help people grasp ${topicLabelEn}?`,
              `How do you ensure the audience truly understands ${topicLabelEn} rather than memorizing it?`,
              `What key lesson or value can be drawn from ${topicLabelEn}?`,
            ];
          case 'lecturer':
            return [
              `What theoretical basis or scientific references underpin ${topicLabelEn}?`,
              `How do you academically justify the methodology in ${topicLabelEn}?`,
              `What are the scholarly limitations of the analysis in ${topicLabelEn}?`,
              `How does ${topicLabelEn} contribute to the existing body of literature?`,
              `How do you empirically validate the main claims in ${topicLabelEn}?`,
            ];
          case 'competition_judge':
            return [
              `What makes ${topicLabelEn} more original and superior to competing entries?`,
              `How significant is the real-world impact ${topicLabelEn} can deliver?`,
              `What is the key innovation in ${topicLabelEn} that judges should recognize?`,
              `How scalable and sustainable is ${topicLabelEn}?`,
              `Why should the judges pick ${topicLabelEn} over other finalists?`,
            ];
          case 'hr_interviewer':
            return [
              `What was your specific personal contribution to ${topicLabelEn}?`,
              `Tell us about the hardest challenge in ${topicLabelEn} and how you overcame it.`,
              `How did you collaborate with your team to deliver ${topicLabelEn}?`,
              `If you could redo ${topicLabelEn}, what would you do differently?`,
              `How does ${topicLabelEn} demonstrate your readiness for the role you seek?`,
            ];
          default: // general_audience
            return [
              `Could you explain ${topicLabelEn} in terms a layperson can easily understand?`,
              `What is the direct benefit of ${topicLabelEn} for someone like me?`,
              `Which part of ${topicLabelEn} is most relevant to everyday life?`,
              `Why should a general audience care about ${topicLabelEn}?`,
              `How would you convince someone skeptical of ${topicLabelEn}?`,
            ];
        }
      };

      // Interleave examiner-flavored and difficulty-flavored questions so BOTH dimensions show.
      const examinerPool = getExaminerPool();
      const merged: string[] = [];
      const maxLen = Math.max(examinerPool.length, pool.length);
      for (let i = 0; i < maxLen; i++) {
        if (examinerPool[i]) merged.push(examinerPool[i]);
        if (pool[i]) merged.push(pool[i]);
      }
      const unique = Array.from(new Set(merged));
      return unique.slice(0, count);
    };

    if (!isOpenAIConfigured) {
      return NextResponse.json({ questions: generateFallbackQuestions() } satisfies GenerateQuestionsResponse);
    }

    const difficultyPrompt =
      difficulty === 'hard'
        ? 'DIFFICULTY LEVEL: HARD / CRITICAL. The examiner must ask demanding, analytical, high-stakes questions. Challenge the presenter’s assumptions, scrutinize edge cases, identify failure points, question methodological limitations, and probe risk mitigation.'
        : difficulty === 'easy'
        ? 'DIFFICULTY LEVEL: EASY / INTRODUCTORY. The examiner must ask friendly, accessible, foundational questions. Focus on basic comprehension, personal motivation, clear definitions, and simple takeaways.'
        : 'DIFFICULTY LEVEL: MEDIUM / PRACTICAL. The examiner must ask balanced, practical questions evaluating methodology, real-world implementation steps, performance metrics, and comparison with alternatives.';

    const prompt = `You are an examiner (${examiner}) conducting a Q&A session.

${difficultyPrompt}

PRESENTATION TOPIC & TITLE:
${presentation_title || 'Presentation Material'}

PRESENTATION MATERIAL & CONTEXT:
${material_summary || 'No detailed summary provided. Use presentation title.'}

KEY POINTS:
${key_points && key_points.length > 0 ? key_points.map((p) => `- ${p}`).join('\n') : `- Core concepts of ${presentation_title || 'the presentation'}`}

LANGUAGE: ${isIndo ? 'Indonesian' : 'English'}

CRITICAL INSTRUCTION:
Generate exactly ${count} targeted, insightful presentation questions that an examiner with persona (${examiner}) and difficulty (${difficulty}) would ask.
Every question MUST be STRICTLY and DIRECTLY relevant to "${presentation_title || 'the presentation material'}" and the provided material context above.
Do NOT generate questions about unrelated topics.

Return strictly valid JSON with an array of exactly ${count} question strings:
{
  "questions": [${Array.from({ length: count })
    .map((_, i) => `"Pertanyaan ${i + 1}"`)
    .join(', ')}]
}`;

    const completion = await createGroqChatCompletion({
      model: AI_MODEL || DEFAULT_FREE_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: difficulty === 'hard' ? 0.7 : 0.5,
    });

    const rawContent = completion.choices[0]?.message?.content ?? '{}';
    let cleanJson = rawContent.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);
    const rawQuestions = Array.isArray(parsed.questions) ? (parsed.questions as string[]) : [];


    if (rawQuestions.length === 0) {
      return NextResponse.json({ questions: generateFallbackQuestions() } satisfies GenerateQuestionsResponse);
    }

    // Ensure exact requested question count
    const finalQuestions = rawQuestions.slice(0, count);
    while (finalQuestions.length < count) {
      const fallbackItems = generateFallbackQuestions();
      const extra = fallbackItems[finalQuestions.length % fallbackItems.length];
      finalQuestions.push(extra);
    }

    return NextResponse.json({ questions: finalQuestions } satisfies GenerateQuestionsResponse);
  } catch (error) {
    console.error('Error in generate-questions:', error);
    const count = 3;
    const defaultQuestions = [
      'Bagaimana Anda memvalidasi keakuratan data dan argumen utama dalam materi presentasi Anda?',
      'Apa keunggulan solusi yang Anda tawarkan dibandingkan pendekatan yang sudah ada?',
      'Bagaimana Anda mengukur kesuksesan implementasi dari materi presentasi ini?',
    ];
    return NextResponse.json({ questions: defaultQuestions.slice(0, count) });
  }
}
