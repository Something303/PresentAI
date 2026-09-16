/**
 * Mock data and services for Demo Mode.
 * When real API keys are not available, these are used as fallbacks.
 * The structure mirrors the real API contracts so they can be easily swapped.
 */

import type {
  Profile,
  PracticeSession,
  Presentation,
  PresentationAnalysis,
  SpeechAnalysis,
  BodyAnalysis,
  QASession,
  AIFeedback,
  DashboardStats,
  AnalyzeMaterialResponse,
  AnalyzeSpeechResponse,
  AnalyzeContentResponse,
  GenerateQuestionsResponse,
  EvaluateAnswerResponse,
  GenerateFeedbackResponse,
} from '@/types';
import { generateId, sleep } from '@/lib/utils';

// ============================================================
// MOCK PROFILE
// ============================================================

export const MOCK_PROFILE: Profile = {
  id: 'demo-user-001',
  name: 'Alex Demo',
  email: 'demo@presentai.app',
  language: 'id',
  preferred_examiner: 'general_audience',
  default_difficulty: 'medium',
  theme: 'system',
  created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

// ============================================================
// MOCK PRESENTATIONS
// ============================================================

export const MOCK_PRESENTATIONS: Presentation[] = [
  {
    id: 'pres-001',
    user_id: 'demo-user-001',
    title: 'Artificial Intelligence in Education',
    description: 'A presentation about AI integration in modern education systems',
    file_url: null as unknown as string,
    file_name: 'ai-in-education.pdf',
    language: 'en',
    duration: 15,
    examiner: 'lecturer',
    difficulty: 'medium',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'pres-002',
    user_id: 'demo-user-001',
    title: 'Dampak Media Sosial terhadap Remaja',
    description: 'Presentasi tentang pengaruh media sosial pada perkembangan remaja',
    file_url: null as unknown as string,
    file_name: 'media-sosial.pptx',
    language: 'id',
    duration: 10,
    examiner: 'teacher',
    difficulty: 'easy',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'pres-003',
    user_id: 'demo-user-001',
    title: 'Strategi Pemasaran Digital 2025',
    description: 'Tren dan strategi pemasaran digital terkini',
    file_url: null as unknown as string,
    file_name: 'digital-marketing.pdf',
    language: 'id',
    duration: 20,
    examiner: 'competition_judge',
    difficulty: 'hard',
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================================
// MOCK SESSIONS
// ============================================================

export const MOCK_SESSIONS: PracticeSession[] = [
  {
    id: 'session-001',
    presentation_id: 'pres-001',
    user_id: 'demo-user-001',
    duration: 890,
    transcript: 'Today I will be presenting about artificial intelligence in education...',
    overall_score: 84,
    content_score: 82,
    speech_score: 88,
    intonation_score: 79,
    body_language_score: 81,
    structure_score: 85,
    qa_score: 87,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    presentation: MOCK_PRESENTATIONS[0],
  },
  {
    id: 'session-002',
    presentation_id: 'pres-002',
    user_id: 'demo-user-001',
    duration: 610,
    transcript: 'Pada kesempatan ini saya akan membahas tentang dampak media sosial...',
    overall_score: 76,
    content_score: 74,
    speech_score: 80,
    intonation_score: 72,
    body_language_score: 75,
    structure_score: 78,
    qa_score: 73,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    presentation: MOCK_PRESENTATIONS[1],
  },
  {
    id: 'session-003',
    presentation_id: 'pres-003',
    user_id: 'demo-user-001',
    duration: 1180,
    transcript: 'Strategi pemasaran digital telah berkembang pesat...',
    overall_score: 69,
    content_score: 72,
    speech_score: 68,
    intonation_score: 65,
    body_language_score: 70,
    structure_score: 67,
    qa_score: 71,
    created_at: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(),
    presentation: MOCK_PRESENTATIONS[2],
  },
];

// ============================================================
// MOCK DASHBOARD STATS
// ============================================================

// NOTE: these read from getStoredSessions() (the user's real completed sessions, with
// MOCK_SESSIONS mixed in only as filler for a brand-new account) — the SAME source the
// "Sesi Terbaru" list and the History page already use. They previously computed straight
// from MOCK_SESSIONS, so the dashboard's stat cards and chart never reflected real practice
// sessions at all, unlike the rest of the dashboard.
export function getMockDashboardStats(sessions: PracticeSession[] = getStoredSessions()): DashboardStats {
  const scores = sessions.map((s) => s.overall_score);
  if (scores.length === 0) {
    return { average_score: 0, total_practices: 0, highest_score: 0, improvement: 0 };
  }
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const highest = Math.max(...scores);
  const latest = scores[0]; // getStoredSessions() returns newest-first
  const previous = scores[1] ?? scores[0];
  const improvement = previous === 0 ? 0 : Math.round(((latest - previous) / previous) * 100);
  return {
    average_score: avg,
    total_practices: sessions.length,
    highest_score: highest,
    improvement,
  };
}

export function getMockChartData(language: 'id' | 'en' = 'id', sessions: PracticeSession[] = getStoredSessions()) {
  return sessions
    .slice()
    .reverse()
    .map((s) => ({
      date: new Date(s.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric' }),
      score: s.overall_score,
      session_id: s.id,
    }));
}

export function getMockProgressData() {
  const sessions = MOCK_SESSIONS.slice().reverse();
  return {
    overall: sessions.map((s) => ({ date: s.created_at, score: s.overall_score })),
    speech: sessions.map((s) => ({ date: s.created_at, score: s.speech_score })),
    body_language: sessions.map((s) => ({ date: s.created_at, score: s.body_language_score })),
    content: sessions.map((s) => ({ date: s.created_at, score: s.content_score })),
    qa: sessions.map((s) => ({ date: s.created_at, score: s.qa_score })),
  };
}

// ============================================================
// MOCK AI SERVICES
// ============================================================

// ============================================================
// SMART CONTENT ANALYSIS HELPERS
// ============================================================

/** Split text into meaningful sentences, filtering out very short fragments */
function extractSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30);
}

/** Pick up to N sentences that are most content-rich (longest meaningful ones) */
function pickTopSentences(sentences: string[], n: number): string[] {
  return [...sentences]
    .sort((a, b) => b.length - a.length)
    .slice(0, n * 3)
    .sort(() => 0) // keep document order after sort by picking first n
    .slice(0, n);
}

/** Detect topic from file content and name */
function detectTopicFromContent(rawText: string, isIndo: boolean, fallbackTitle?: string): string {
  const normalized = rawText.toLowerCase();

  // If explicit title was provided/extracted
  if (fallbackTitle && fallbackTitle.trim().length > 2) {
    const cleanTitle = fallbackTitle.trim();
    if (!/^(presentasi|presentation|slide|materi|untitled|baru|new)$/i.test(cleanTitle)) {
      return cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    }
  }

  // Try extracting from "Judul:" line
  const judulMatch = rawText.match(/(?:^|\n)\s*judul:\s*([^\n\r]+)/i);
  if (judulMatch?.[1] && judulMatch[1].trim().length > 2) {
    const t = judulMatch[1].trim();
    if (!/^(presentasi|presentation|slide|materi|untitled)$/i.test(t)) {
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
  }

  // Check domain keywords
  if (/kecerdasan buatan|artificial intelligence|machine learning|chatgpt|llm|neural network|deep learning/.test(normalized)) {
    return isIndo ? 'Kecerdasan Buatan dan Pembelajaran Mesin' : 'Artificial Intelligence & Machine Learning';
  }
  if (/pemasaran digital|digital marketing|brand|seo|social media marketing|konten marketing/.test(normalized)) {
    return isIndo ? 'Strategi Pemasaran Digital' : 'Digital Marketing Strategy';
  }
  if (/media sosial|sosial media|remaja|screen time|instagram|tiktok|facebook/.test(normalized)) {
    return isIndo ? 'Dampak Media Sosial terhadap Remaja' : 'Impact of Social Media on Teenagers';
  }
  if (/startup|entrepreneurship|bisnis|business|revenue|profit|investor/.test(normalized)) {
    return isIndo ? 'Kewirausahaan dan Strategi Bisnis' : 'Entrepreneurship & Business Strategy';
  }
  if (/kesehatan|health|medical|penyakit|disease|obat|treatment|klinis/.test(normalized)) {
    return isIndo ? 'Kesehatan dan Ilmu Medis' : 'Health & Medical Sciences';
  }
  if (/lingkungan|environment|climate|iklim|sustainability|energi terbarukan|renewable/.test(normalized)) {
    return isIndo ? 'Lingkungan dan Keberlanjutan' : 'Environment & Sustainability';
  }
  if (/pendidikan|education|kurikulum|curriculum|siswa|student|belajar|learning/.test(normalized)) {
    return isIndo ? 'Pendidikan dan Pembelajaran Modern' : 'Modern Education & Learning';
  }
  if (/teknologi|technology|software|hardware|programming|cloud|cyber|data/.test(normalized)) {
    return isIndo ? 'Teknologi dan Inovasi Digital' : 'Technology & Digital Innovation';
  }
  if (/ekonomi|economy|finance|keuangan|inflasi|inflation|pasar|market/.test(normalized)) {
    return isIndo ? 'Ekonomi dan Keuangan' : 'Economics & Finance';
  }
  if (/hukum|law|legal|peraturan|regulation|kebijakan|policy|pemerintah|government/.test(normalized)) {
    return isIndo ? 'Hukum, Kebijakan & Regulasi' : 'Law, Policy & Regulation';
  }
  if (/budaya|culture|seni|art|sejarah|history|sastra|literature|bahasa|language/.test(normalized)) {
    return isIndo ? 'Budaya, Seni & Humaniora' : 'Culture, Arts & Humanities';
  }

  // Fallback: look for the first non-trivial line in rawText
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 5 && !/^(judul|deskripsi|topik):/i.test(l));
  if (lines.length > 0) {
    const firstClean = lines[0].replace(/^[#\-*0-9.]+\s*/, '').slice(0, 60).trim();
    if (firstClean.length > 3 && !/^(presentasi|slide|materi)/i.test(firstClean)) {
      return firstClean.charAt(0).toUpperCase() + firstClean.slice(1);
    }
  }

  return isIndo ? 'Materi Presentasi' : 'Presentation Material';
}


/** Detect whether file has recognizable structural sections */
function detectStructure(normalized: string): { hasIntro: boolean; hasBody: boolean; hasConclusion: boolean } {
  const hasIntro = /pendahuluan|latar belakang|introduction|background|overview|tujuan|objective|agenda/.test(normalized);
  const hasBody = /pembahasan|isi|content|materi|analisis|analysis|hasil|result|data|fakta|fact/.test(normalized);
  const hasConclusion = /kesimpulan|penutup|conclusion|summary|ringkasan|saran|recommendation|tindak lanjut/.test(normalized);
  return { hasIntro, hasBody, hasConclusion };
}

/** Extract up to 3-5 meaningful key points from actual content */
function extractKeyPoints(text: string, isIndo: boolean): string[] {
  const sentences = extractSentences(text);
  if (sentences.length === 0) {
    return isIndo
      ? [
          'Penyusunan alur cerita presentasi yang terstruktur dan mudah dipahami.',
          'Penerapan teknik vokal dan bahasa tubuh yang meningkatkan keterlibatan audiens.',
          'Penguasaan materi inti dan kesiapan menghadapi sesi tanya jawab.',
        ]
      : [
          'Structured storytelling that guides the audience seamlessly.',
          'Vocal techniques and confident body language to maximize engagement.',
          'Core topic mastery and strategic readiness for Q&A sessions.',
        ];
  }

  // Prioritize sentences containing keywords that signal key points
  const keywordPatterns = isIndo
    ? /\b(penting|utama|kunci|kesimpulan|hasil|solusi|tujuan|manfaat|dampak|masalah|strategi|faktor|peran|fungsi)\b/i
    : /\b(important|key|main|critical|result|solution|goal|benefit|impact|problem|strategy|factor|role|function)\b/i;

  const scored = sentences.map((s) => ({ s, score: (s.match(keywordPatterns) || []).length }));
  const topSentences = scored
    .sort((a, b) => b.score - a.score || b.s.length - a.s.length)
    .slice(0, 5)
    .map((x) => x.s);

  // Trim to 120 chars max per point
  return topSentences.map((s) => (s.length > 120 ? s.slice(0, 117) + '...' : s));
}

/** Detect weak sections based on content analysis */
function detectWeakSections(text: string, structure: ReturnType<typeof detectStructure>, isIndo: boolean): string[] {
  const weak: string[] = [];
  if (!structure.hasIntro) {
    weak.push(isIndo ? 'Bagian pendahuluan atau latar belakang tidak terdeteksi — pertimbangkan untuk menambahkannya.' : 'No introduction or background section detected — consider adding one.');
  }
  if (!structure.hasConclusion) {
    weak.push(isIndo ? 'Bagian kesimpulan dan rekomendasi belum ada atau kurang menonjol.' : 'Conclusion and recommendation section is missing or not prominent.');
  }
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 150) {
    weak.push(isIndo ? 'Konten materi masih tergolong singkat — pertimbangkan menambah detail atau data pendukung.' : 'Material content is quite brief — consider adding more detail or supporting data.');
  }
  // Check for data/statistics
  if (!/\d+[%,.]|\bdata\b|\bstatistik\b|\bstatistic\b|\bsurvey\b|\briset\b|\bresearch\b/i.test(text)) {
    weak.push(isIndo ? 'Kurangnya data statistik atau riset — argumen akan lebih kuat dengan bukti kuantitatif.' : 'Lacks statistical data or research references — arguments would be stronger with quantitative evidence.');
  }
  if (weak.length === 0) {
    weak.push(isIndo ? 'Transisi antar bagian bisa dibuat lebih halus untuk alur presentasi yang lebih baik.' : 'Transitions between sections could be smoother for better presentation flow.');
  }
  return weak;
}

export async function mockAnalyzeMaterial(input?: {
  language?: 'id' | 'en';
  fileContent?: string;
  fileName?: string;
  fileType?: 'pdf' | 'pptx' | 'docx' | 'text';
}): Promise<AnalyzeMaterialResponse> {
  await sleep(1500); // simulate brief processing delay

  const rawContent = input?.fileContent ?? '';
  const isIndo = input?.language === 'id';

  // Detect topic before newlines are squashed
  const topic = detectTopicFromContent(rawContent, isIndo, input?.fileName);

  // Clean text for sentence extraction
  const cleanText = rawContent
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const normalized = cleanText.toLowerCase();
  const structure = detectStructure(normalized);
  const sentences = extractSentences(cleanText);
  const hasContent = cleanText.length > 50;

  // Build summary from content
  let summary: string;
  if (hasContent && sentences.length > 0) {
    const topSentences = pickTopSentences(sentences, 3);
    const extracted = topSentences.join(' ').slice(0, 400);
    summary = isIndo
      ? `Materi ini membahas topik "${topic}". ${extracted}${extracted.length >= 390 ? '...' : ''}`
      : `This material covers "${topic}". ${extracted}${extracted.length >= 390 ? '...' : ''}`;
  } else {
    summary = isIndo
      ? `Materi ini membahas topik "${topic}" dengan fokus pada konteks masalah, analisis argumen utama, dan langkah solusi yang relevan.`
      : `This material covers "${topic}" focusing on problem context, key argument analysis, and actionable steps.`;
  }

  // Main idea
  let mainIdea: string;
  const firstSentence = sentences[0] ?? '';
  if (firstSentence.length > 30) {
    mainIdea = firstSentence.length > 160 ? firstSentence.slice(0, 157) + '...' : firstSentence;
  } else {
    mainIdea = isIndo
      ? `Membahas ${topic.toLowerCase()} serta memberikan solusi terukur yang dapat diterapkan secara praktis.`
      : `Examines ${topic.toLowerCase()} and provides actionable, measurable solutions for the audience.`;
  }


  const keyPoints = extractKeyPoints(cleanText, isIndo);
  const weakSections = detectWeakSections(cleanText, structure, isIndo);

  // Generate contextual questions based on topic
  const potentialQuestions: string[] = isIndo
    ? [
        `Apa alasan utama mengapa ${topic.toLowerCase()} menjadi isu penting saat ini?`,
        `Bagaimana solusi yang Anda tawarkan berbeda dari pendekatan yang sudah ada?`,
        `Apa tantangan terbesar dalam mengimplementasikan ide yang Anda presentasikan?`,
      ]
    : [
        `Why is ${topic.toLowerCase()} considered a critical issue at this time?`,
        `How does your proposed solution differ from existing approaches?`,
        `What are the biggest challenges in implementing the ideas you've presented?`,
      ];

  // Generate contextual suggestions
  const suggestions: string[] = [];
  if (!structure.hasIntro) {
    suggestions.push(isIndo ? 'Tambahkan slide pendahuluan yang menjelaskan latar belakang dan tujuan presentasi.' : 'Add an introduction slide that explains the background and objectives of the presentation.');
  }
  if (!structure.hasConclusion) {
    suggestions.push(isIndo ? 'Tutup presentasi dengan slide kesimpulan yang merangkum poin utama dan call-to-action.' : 'Close with a conclusion slide summarizing key points and a clear call-to-action.');
  }
  suggestions.push(
    isIndo ? 'Perkuat argumen dengan menambahkan data statistik atau riset terkini yang relevan.' : 'Strengthen your argument with recent statistics or research findings.',
    isIndo ? 'Gunakan contoh kasus nyata untuk membantu audiens memahami konsep yang dibahas.' : 'Use real-world case studies to help the audience grasp the concepts presented.',
  );

  const missingInfo: string[] = isIndo
    ? [
        structure.hasIntro ? 'Referensi atau kutipan sumber data yang digunakan.' : 'Bagian pendahuluan dengan konteks masalah yang jelas.',
        'Perbandingan atau analisis alternatif terhadap solusi yang ditawarkan.',
      ]
    : [
        structure.hasIntro ? 'Source citations or references for data used.' : 'An introduction section with clear problem context.',
        'Comparative analysis or alternative solutions to the proposed approach.',
      ];

  return {
    summary,
    topic,
    main_idea: mainIdea,
    key_points: keyPoints.slice(0, 5),
    potential_questions: potentialQuestions,
    suggestions: suggestions.slice(0, 4),
    weak_sections: weakSections,
    missing_information: missingInfo,
  };
}

export async function mockAnalyzeSpeech(duration: number): Promise<AnalyzeSpeechResponse> {
  await sleep(1500);
  const wpm = Math.floor(120 + Math.random() * 40);
  return {
    words_per_minute: wpm,
    filler_words: Math.floor(5 + Math.random() * 10),
    filler_word_list: ['um', 'uh', 'eh', 'jadi', 'kan'],
    pause_count: Math.floor(3 + Math.random() * 8),
    clarity_score: Math.floor(70 + Math.random() * 25),
    pace_score: wpm > 160 ? 60 : wpm < 100 ? 65 : Math.floor(75 + Math.random() * 20),
    intonation_score: Math.floor(68 + Math.random() * 25),
    speech_score: Math.floor(72 + Math.random() * 20),
  };
}

export async function mockAnalyzeContent(_: unknown): Promise<AnalyzeContentResponse> {
  await sleep(1500);
  return {
    content_score: Math.floor(75 + Math.random() * 20),
    structure_score: Math.floor(72 + Math.random() * 20),
    relevance: Math.floor(80 + Math.random() * 18),
    accuracy: Math.floor(78 + Math.random() * 18),
    completeness: Math.floor(70 + Math.random() * 20),
    reasoning:
      'Presenter mencakup sebagian besar poin kunci dari materi, namun beberapa konsep penting tidak dijelaskan secara mendalam. Struktur presentasi cukup logis dengan pendahuluan yang jelas.',
  };
}

export async function mockGenerateQuestions(_: unknown, lang: 'id' | 'en'): Promise<GenerateQuestionsResponse> {
  await sleep(1000);
  if (lang === 'en') {
    return {
      questions: [
        'How do you see AI transforming the role of teachers in the next 5 years?',
        'What ethical concerns should schools consider before implementing AI systems?',
        'Can you explain how personalized learning with AI differs from traditional teaching methods?',
        'What evidence supports the effectiveness of AI-assisted learning?',
      ],
    };
  }
  return {
    questions: [
      'Bagaimana menurut Anda, AI akan mengubah peran guru dalam 5 tahun ke depan?',
      'Apa saja masalah etika yang perlu dipertimbangkan sekolah sebelum menerapkan AI?',
      'Bisakah Anda jelaskan perbedaan pembelajaran yang dipersonalisasi dengan AI dibanding metode konvensional?',
      'Bukti apa yang mendukung efektivitas pembelajaran berbantuan AI?',
    ],
  };
}

export async function mockEvaluateAnswer(_: unknown): Promise<EvaluateAnswerResponse> {
  await sleep(1000);
  const score = Math.floor(65 + Math.random() * 30);
  return {
    score,
    feedback:
      score >= 80
        ? 'Jawaban yang sangat baik! Anda menjelaskan konsep dengan jelas dan memberikan contoh yang relevan.'
        : score >= 65
        ? 'Jawaban cukup baik, namun bisa diperkuat dengan contoh konkret dan analisis yang lebih mendalam.'
        : 'Jawaban perlu dikembangkan lebih lanjut. Coba fokus pada poin-poin utama dan berikan justifikasi yang lebih kuat.',
  };
}

export async function mockGenerateFeedback(scores: {
  overall: number;
  content: number;
  speech: number;
  body_language: number;
}): Promise<GenerateFeedbackResponse> {
  await sleep(1500);
  return {
    strengths: [
      'Struktur presentasi sudah jelas dan mudah diikuti dengan baik',
      'Pemilihan kata dan diksi cukup profesional dan sesuai audiens',
      scores.speech >= 75
        ? 'Kejelasan bicara sangat baik, audiens dapat memahami dengan mudah'
        : 'Penguasaan materi terlihat cukup baik meskipun ada beberapa bagian yang kurang detail',
    ],
    improvements: [
      'Kurangi penggunaan kata pengisi seperti "um", "uh", dan "jadi" saat berpindah slide',
      scores.body_language < 75
        ? 'Tingkatkan kontak mata dengan kamera/audiens untuk menciptakan koneksi yang lebih baik'
        : 'Variasikan tempo bicara untuk menekankan poin-poin penting',
      'Tambahkan contoh konkret dan data pendukung untuk memperkuat argumen',
    ],
    recommendations: [
      'Latih transisi antar slide dengan berhenti sejenak 1-2 detik sebelum melanjutkan ke poin berikutnya',
      'Rekam dirimu berlatih dan tonton kembali untuk mengidentifikasi kebiasaan bicara yang perlu diperbaiki',
      'Fokus pada 2-3 poin utama yang paling penting daripada mencoba mencakup semua informasi',
    ],
  };
}

// ============================================================
// MOCK SPEECH ANALYSIS DATA
// ============================================================

export function getMockSpeechAnalysis(sessionId: string): SpeechAnalysis {
  return {
    id: `speech-${sessionId}`,
    session_id: sessionId,
    words_per_minute: 142,
    filler_words: 8,
    filler_word_list: ['um', 'uh', 'jadi', 'kan', 'eh'],
    pause_count: 5,
    clarity_score: 82,
    pace_score: 78,
    intonation_score: 75,
  };
}

export function getMockBodyAnalysis(sessionId: string): BodyAnalysis {
  return {
    id: `body-${sessionId}`,
    session_id: sessionId,
    eye_contact_score: 76,
    posture_score: 82,
    gesture_score: 71,
    expression_score: 78,
    movement_score: 85,
  };
}

export function getMockQASessions(sessionId: string): QASession[] {
  return [
    {
      id: `qa-1-${sessionId}`,
      session_id: sessionId,
      question: 'Bagaimana AI dapat membantu siswa dengan kebutuhan belajar yang berbeda?',
      answer: 'AI dapat menyesuaikan materi dan kecepatan pembelajaran sesuai kebutuhan individu siswa...',
      score: 82,
      feedback: 'Jawaban yang baik dengan penjelasan yang jelas.',
      order_index: 0,
    },
    {
      id: `qa-2-${sessionId}`,
      session_id: sessionId,
      question: 'Apa risiko utama penggunaan AI dalam pendidikan?',
      answer: 'Risiko utama meliputi privasi data siswa dan potensi bias algoritma...',
      score: 75,
      feedback: 'Jawaban mencakup poin penting namun bisa lebih komprehensif.',
      order_index: 1,
    },
    {
      id: `qa-3-${sessionId}`,
      session_id: sessionId,
      question: 'Bagaimana peran guru akan berubah dengan adanya AI?',
      answer: 'Guru akan lebih fokus pada aspek emosional dan motivasi siswa...',
      score: 88,
      feedback: 'Jawaban sangat baik dengan perspektif yang mendalam.',
      order_index: 2,
    },
  ];
}

export function getMockAIFeedback(sessionId: string): AIFeedback {
  return {
    id: `feedback-${sessionId}`,
    session_id: sessionId,
    strengths: [
      'Struktur presentasi yang jelas dan terorganisir dengan baik',
      'Kejelasan bicara di atas rata-rata, audiens dapat memahami dengan mudah',
      'Kemampuan menjawab pertanyaan menunjukkan penguasaan materi yang solid',
    ],
    improvements: [
      'Kurangi penggunaan kata pengisi (8 kata pengisi terdeteksi)',
      'Tingkatkan kontak mata dengan kamera untuk menciptakan koneksi lebih baik',
      'Variasikan tempo bicara untuk menekankan poin-poin penting',
    ],
    recommendations: [
      'Latih transisi antar slide dengan berhenti 1-2 detik sebelum melanjutkan ke poin berikutnya',
      'Rekam dirimu berlatih dan tonton kembali untuk mengidentifikasi kebiasaan yang perlu diperbaiki',
      'Fokus pada 2-3 poin utama daripada mencakup semua informasi sekaligus',
    ],
    created_at: new Date().toISOString(),
  };
}

// ============================================================
// PRESENTATION STORAGE (localStorage for demo mode)
// ============================================================

const STORAGE_KEYS = {
  presentations: 'presentai-presentations',
  sessions: 'presentai-sessions',
  analyses: 'presentai-analyses',
} as const;

export function getStoredPresentations(): Presentation[] {
  if (typeof window === 'undefined') return MOCK_PRESENTATIONS;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.presentations);
    if (stored) {
      const parsed = JSON.parse(stored) as Presentation[];
      return [...parsed, ...MOCK_PRESENTATIONS.filter(p => !parsed.find(sp => sp.id === p.id))];
    }
  } catch { /* ignore */ }
  return MOCK_PRESENTATIONS;
}

export function storePresentations(presentations: Presentation[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.presentations, JSON.stringify(presentations));
}

export function addPresentation(presentation: Presentation): void {
  const existing = getStoredPresentations();
  storePresentations([presentation, ...existing.filter(p => !MOCK_PRESENTATIONS.find(m => m.id === p.id))]);
}

export function getStoredSessions(): PracticeSession[] {
  if (typeof window === 'undefined') return MOCK_SESSIONS;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.sessions);
    if (stored) {
      const parsed = JSON.parse(stored) as PracticeSession[];
      return [...parsed, ...MOCK_SESSIONS.filter(s => !parsed.find(ss => ss.id === s.id))];
    }
  } catch { /* ignore */ }
  return MOCK_SESSIONS;
}

export function storeSession(session: PracticeSession): void {
  const existing = getStoredSessions().filter(s => !MOCK_SESSIONS.find(m => m.id === s.id));
  localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([session, ...existing]));
}

export function getMockAnalysis(presentationId: string): PresentationAnalysis {
  // Try to find the linked presentation for context
  const presentations = typeof window !== 'undefined' ? getStoredPresentations() : MOCK_PRESENTATIONS;
  const pres = presentations.find((p) => p.id === presentationId);
  const title = pres?.title ?? 'Presentasi';
  const desc = pres?.description ?? '';
  const lang = pres?.language ?? 'id';
  const isIndo = lang === 'id';

  // Derive topic and content from presentation metadata
  const topicSource = `${title} ${desc}`.toLowerCase();
  const topic = detectTopicFromContent(topicSource, isIndo);

  return {
    id: `analysis-${presentationId}`,
    presentation_id: presentationId,
    summary: isIndo
      ? `Presentasi "${title}" membahas ${topic.toLowerCase()}. ${desc || 'Materi mencakup argumen utama, data pendukung, dan rekomendasi yang relevan bagi audiens.'}`
      : `The presentation "${title}" covers ${topic.toLowerCase()}. ${desc || 'The material includes key arguments, supporting data, and recommendations for the audience.'}`,
    key_points: isIndo
      ? [
          `Konteks dan latar belakang ${topic.toLowerCase()} yang perlu dipahami audiens.`,
          `Analisis inti permasalahan dan faktor-faktor yang mempengaruhi ${topic.toLowerCase()}.`,
          `Solusi, rekomendasi, atau langkah tindak lanjut yang ditawarkan dalam presentasi.`,
        ]
      : [
          `Context and background of ${topic.toLowerCase()} that the audience needs to understand.`,
          `Core problem analysis and factors influencing ${topic.toLowerCase()}.`,
          `Solutions, recommendations, or next steps proposed in the presentation.`,
        ],
    potential_questions: isIndo
      ? [
          `Mengapa ${topic.toLowerCase()} relevan untuk dibahas saat ini?`,
          `Bagaimana penerapan solusi yang Anda tawarkan dalam konteks nyata?`,
          `Apa tantangan utama dan bagaimana cara mengatasinya?`,
        ]
      : [
          `Why is ${topic.toLowerCase()} relevant to discuss right now?`,
          `How can the solution you propose be applied in a real-world context?`,
          `What are the main challenges and how can they be overcome?`,
        ],
    suggestions: isIndo
      ? [
          'Tambahkan data atau statistik terkini untuk memperkuat argumen.',
          'Perkuat bagian kesimpulan dengan call-to-action yang jelas.',
        ]
      : [
          'Add recent data or statistics to strengthen your arguments.',
          'Enhance the conclusion with a clear and compelling call-to-action.',
        ],
    topic,
    main_idea: isIndo
      ? `Inti presentasi adalah membahas ${topic.toLowerCase()} secara mendalam dan menawarkan perspektif atau solusi yang dapat diterapkan.`
      : `The core of the presentation is to deeply examine ${topic.toLowerCase()} and offer actionable perspectives or solutions.`,
    weak_sections: isIndo
      ? ['Bagian kesimpulan dan call-to-action perlu diperkuat agar pesan lebih berkesan.']
      : ['The conclusion and call-to-action section needs to be strengthened for greater impact.'],
    missing_information: isIndo
      ? ['Data statistik atau studi kasus yang mendukung klaim utama.', 'Perbandingan dengan alternatif solusi lainnya.']
      : ['Statistical data or case studies supporting the main claims.', 'Comparison with alternative solutions.'],
    created_at: new Date().toISOString(),
  };
}
