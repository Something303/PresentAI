import OpenAI from 'openai';

// Groq-only setup — uses the OpenAI-compatible SDK with Groq's endpoint.

const rawGroqKey = process.env.GROQ_API_KEY?.trim() ?? '';

// Check if a real key has been entered (exclude placeholders)
export const isOpenAIConfigured = Boolean(
  rawGroqKey &&
  rawGroqKey.startsWith('gsk_') &&
  !rawGroqKey.includes('GANTI_DENGAN_KEY') &&
  !rawGroqKey.includes('YOUR_KEY') &&
  rawGroqKey.length > 25
);

export const openai = isOpenAIConfigured
  ? new OpenAI({
    apiKey: rawGroqKey,
    baseURL: 'https://api.groq.com/openai/v1',
  })
  : (null as unknown as OpenAI);

// Model Groq yang aktif dan terverifikasi dengan rate limit tinggi.
// NOTE: Groq periodically deprecates/decommissions models. Verify against
// GET https://api.groq.com/openai/v1/models (with your key) before changing these —
// llama-3.3-70b-versatile, llama-3.1-8b-instant, gemma2-9b-it and mixtral-8x7b-32768
// were all previously listed here but are no longer available on this account/Groq's
// lineup, which caused every chat-completion request to burn through 3 dead fallbacks
// before failing outright.
export const DEFAULT_FREE_MODEL = 'qwen/qwen3.8-27b';
export const AI_MODEL = process.env.AI_MODEL || DEFAULT_FREE_MODEL;

// Always true since we only support Groq
export const IS_GROQ = true;

// Prioritized list of active, general-purpose chat models on Groq for automatic fallback.
// (Excludes whisper-large-v3* — audio-only — and prompt-guard/orpheus/allam models, which
// are safety classifiers / TTS / not verified for our JSON-mode chat prompts.)
const CANDIDATE_MODELS = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.6-27b',
  'groq/compound-mini',
];

/**
 * Robust chat completion wrapper that auto-falls back across candidate models
 * if the requested model is not found or fails.
 */
export async function createGroqChatCompletion(
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
) {
  if (!isOpenAIConfigured || !openai) {
    throw new Error('Groq API Key is not configured');
  }

  const requestedModel = params.model || AI_MODEL;
  const modelsToTry = [
    requestedModel,
    ...CANDIDATE_MODELS.filter((m) => m !== requestedModel),
  ];

  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      return await openai.chat.completions.create({
        ...params,
        model,
      });
    } catch (err: unknown) {
      lastError = err;
      const e = err as Record<string, unknown>;
      const inner = e?.error as Record<string, unknown> | undefined;
      const code = e?.code ?? inner?.code;
      const message = typeof e?.message === 'string' ? e.message : (typeof inner?.message === 'string' ? inner.message : '');

      // Any error that means THIS model is unusable (missing, decommissioned, or rate-limited)
      // should fall through to the next candidate rather than crash the whole request —
      // Groq's lineup changes over time, so treat unknown model-shaped errors defensively too.
      const isUnusableModel =
        e?.status === 404 ||
        Number(e?.status) === 429 ||
        code === 'model_not_found' ||
        code === 'model_decommissioned' ||
        message.includes('model_not_found') ||
        message.includes('decommissioned') ||
        message.includes('no longer supported');

      if (isUnusableModel) {
        console.warn(`[Groq] Model "${model}" unavailable (${code || e?.status || 'unknown'}). Trying next fallback...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error('All Groq candidate models failed');
}


/**
 * Returns true when the error means we should fall back to mock data
 * instead of crashing the server with 500.
 */
export function isOpenAIQuotaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;
  const status = Number(e.status);
  if (status === 401 || status === 403 || status === 404 || status === 429) return true;
  if (
    e.code === 'invalid_api_key' ||
    e.code === 'credit_balance_exhausted' ||
    e.code === 'insufficient_quota' ||
    e.code === 'rate_limit_exceeded' ||
    e.code === 'model_not_found'
  ) return true;
  const inner = e.error as Record<string, unknown> | undefined;
  if (
    inner?.code === 'invalid_api_key' ||
    inner?.code === 'credit_balance_exhausted' ||
    inner?.code === 'insufficient_quota' ||
    inner?.type === 'insufficient_quota' ||
    inner?.code === 'rate_limit_exceeded' ||
    inner?.code === 'model_not_found'
  ) return true;
  return false;
}


