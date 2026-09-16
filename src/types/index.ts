// ============================================================
// CORE ENTITY TYPES
// ============================================================

export type Language = 'id' | 'en';
export type Theme = 'light' | 'dark' | 'system';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ExaminerType = 'teacher' | 'lecturer' | 'competition_judge' | 'hr_interviewer' | 'general_audience';
export type PresentationLanguage = 'id' | 'en' | 'auto';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  language: Language;
  preferred_examiner: ExaminerType;
  default_difficulty: Difficulty;
  theme: Theme;
  created_at: string;
}

export interface Presentation {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  language: PresentationLanguage;
  duration?: number; // minutes
  examiner: ExaminerType;
  difficulty: Difficulty;
  question_count_mode?: 'auto' | 'custom';
  custom_question_count?: number;
  created_at: string;
}

export interface PresentationAnalysis {
  id: string;
  presentation_id: string;
  summary: string;
  key_points: string[];
  potential_questions: string[];
  suggestions: string[];
  topic?: string;
  main_idea?: string;
  weak_sections?: string[];
  missing_information?: string[];
  created_at: string;
}

export interface PracticeSession {
  id: string;
  presentation_id: string;
  user_id: string;
  duration: number; // seconds
  transcript?: string;
  overall_score: number;
  content_score: number;
  speech_score: number;
  intonation_score: number;
  body_language_score: number;
  structure_score: number;
  qa_score: number;
  created_at: string;
  // Joined fields
  presentation?: Presentation;
}

export interface SpeechAnalysis {
  id: string;
  session_id: string;
  words_per_minute: number;
  filler_words: number;
  filler_word_list?: string[];
  pause_count: number;
  clarity_score: number;
  pace_score: number;
  intonation_score: number;
}

export interface BodyAnalysis {
  id: string;
  session_id: string;
  eye_contact_score: number;
  posture_score: number;
  gesture_score: number;
  expression_score: number;
  movement_score: number;
}

export interface QASession {
  id: string;
  session_id: string;
  question: string;
  answer?: string;
  score?: number;
  feedback?: string;
  order_index: number;
}

export interface AIFeedback {
  id: string;
  session_id: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  created_at: string;
}

// ============================================================
// UI / COMPONENT TYPES
// ============================================================

export interface ScoreCategory {
  label: string;
  score: number;
  weight: number;
  color: string;
  icon?: string;
}

export interface ChartDataPoint {
  date: string;
  score: number;
  session_id?: string;
}

export interface ProgressData {
  overall: ChartDataPoint[];
  speech: ChartDataPoint[];
  body_language: ChartDataPoint[];
  content: ChartDataPoint[];
  qa: ChartDataPoint[];
}

export interface DashboardStats {
  average_score: number;
  total_practices: number;
  highest_score: number;
  improvement: number; // percentage change
}

// ============================================================
// API REQUEST / RESPONSE TYPES
// ============================================================

export interface AnalyzeMaterialRequest {
  fileContent: string; // base64 or text
  fileType: 'pdf' | 'pptx' | 'docx' | 'text';
  language: Language;
}

export interface AnalyzeMaterialResponse {
  summary: string;
  topic: string;
  main_idea: string;
  key_points: string[];
  potential_questions: string[];
  suggestions: string[];
  weak_sections: string[];
  missing_information: string[];
  /** Indicates whether the response came from real AI ('ai') or a mock fallback ('mock'). */
  _source?: 'ai' | 'mock';
}

export interface AnalyzeSpeechRequest {
  transcript: string;
  duration: number;
  language: Language;
}

export interface AnalyzeSpeechResponse {
  words_per_minute: number;
  filler_words: number;
  filler_word_list: string[];
  pause_count: number;
  clarity_score: number;
  pace_score: number;
  intonation_score: number;
  speech_score: number;
}

export interface AnalyzeContentRequest {
  material_summary: string;
  key_points: string[];
  transcript: string;
  language: Language;
}

export interface AnalyzeContentResponse {
  content_score: number;
  structure_score: number;
  relevance: number;
  accuracy: number;
  completeness: number;
  reasoning: string;
}

export interface GenerateQuestionsRequest {
  presentation_title?: string;
  material_summary: string;
  key_points: string[];
  difficulty: Difficulty;
  examiner: ExaminerType;
  language: Language;
  question_count?: number;
  previous_answers?: string[];
}

export interface GenerateQuestionsResponse {
  questions: string[];
}

export interface EvaluateAnswerRequest {
  question: string;
  answer: string;
  material_context: string;
  language: Language;
  difficulty?: Difficulty;
  examiner?: ExaminerType;
}

export interface EvaluateAnswerResponse {
  score: number;
  feedback: string;
}

export interface GenerateFeedbackRequest {
  presentation_title?: string;
  transcript?: string;
  material_summary?: string;
  scores: {
    overall: number;
    content: number;
    speech: number;
    intonation: number;
    body_language: number;
    structure: number;
    qa: number;
  };
  speech_data?: Partial<SpeechAnalysis>;
  body_data?: Partial<BodyAnalysis>;
  qa_sessions?: Partial<QASession>[];
  language: Language;
}

export interface GenerateFeedbackResponse {
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}

// ============================================================
// FORM TYPES
// ============================================================

export interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface CreatePresentationForm {
  title: string;
  description?: string;
  language: PresentationLanguage;
  duration?: number;
  examiner: ExaminerType;
  difficulty: Difficulty;
  question_count_mode?: 'auto' | 'custom';
  custom_question_count?: number;
}

// ============================================================
// MEDIA / RECORDING TYPES
// ============================================================

export interface MediaPipeResult {
  eyeContactScore: number;
  postureScore: number;
  gestureScore: number;
  expressionScore: number;
  movementScore: number;
  bodyLanguageScore: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  transcript: string;
  currentSlide: number;
}
