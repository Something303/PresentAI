import { NextRequest, NextResponse } from 'next/server';
import {
  isOpenAIConfigured,
  isOpenAIQuotaError,
  createGroqChatCompletion,
  AI_MODEL,
  DEFAULT_FREE_MODEL,
} from '@/lib/openai/client';
import type { AnalyzeSpeechRequest, AnalyzeSpeechResponse } from '@/types';


function extractFillers(transcript: string, language: string): { count: number; list: string[] } {
  const lower = transcript.toLowerCase();
  const found: { word: string }[] = [];

  if (language === 'id') {
    // Filler word token patterns — match standalone words/tokens
    const tokenPatterns = [
      // Extended vocal hesitations (eee, eeeh, emm, umm, uhh, ahh, hmm)
      /\b(e{2,}|e+h+|e+m+|u+m+|u+h+|a+h+|h+m+|h+n+)\b/gi,
      // Common Indonesian filler words
      /\b(eh|anu|kayak|kayaknya|gitu|gitunya|jadi|terus|nah|kan|dong|hmm|hm|uh|um|ehm|emm|em|ee|ye|yaa|ya ya|ga|bah|wah)\b/gi,
      // Common multi-word filler phrases
      /\b(apa namanya|apa ya|gimana ya|seperti itu|ya kan|kan ya|kayak gitu|maksud saya|dalam artian|artinya kan|semacam itu|begitu ya|intinya kan|pokoknya|pada dasarnya|sebenarnya|kurang lebih)\b/gi,
    ];
    for (const pat of tokenPatterns) {
      let m;
      const re = new RegExp(pat.source, pat.flags.replace('g', 'g'));
      while ((m = re.exec(lower)) !== null) {
        found.push({ word: m[0].trim() });
      }
    }
  } else {
    // English filler words & patterns
    const tokenPatterns = [
      /\b(u+m+|u+h+|e+r+|a+h+|h+m+)\b/gi,
      /\b(um|uh|er|ah|like|basically|actually|sort of|kind of|i mean|you know|you see|so yeah|literally|honestly)\b/gi,
    ];
    for (const pat of tokenPatterns) {
      let m;
      const re = new RegExp(pat.source, pat.flags.replace('g', 'g'));
      while ((m = re.exec(lower)) !== null) {
        found.push({ word: m[0].trim() });
      }
    }
  }

  const uniqueTypes = Array.from(new Set(found.map((f) => f.word))).slice(0, 8);
  return {
    count: found.length,
    list: uniqueTypes,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeSpeechRequest;
    const { transcript = '', duration = 60, language = 'id' } = body;

    const words = transcript.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const minutes = Math.max(0.1, duration / 60);
    const calculatedWpm = wordCount === 0 ? 0 : Math.round(wordCount / minutes);

    const { count: fillerCount, list: fillerList } = extractFillers(transcript, language);

    if (!isOpenAIConfigured) {
      // --- Silence / No-Speech Detection ---
      if (wordCount === 0) {
        return NextResponse.json({
          words_per_minute: 0,
          filler_words: 0,
          filler_word_list: [],
          pause_count: 0,
          clarity_score: 10,
          pace_score: 5,
          intonation_score: 5,
          speech_score: 8,
        } satisfies AnalyzeSpeechResponse);
      }

      // Very short speech (< 20 words)
      if (wordCount < 20) {
        const brevityPenalty = Math.max(0, (20 - wordCount) / 20);
        const paceScore = Math.round(40 - brevityPenalty * 20);
        const clarityScore = Math.round(50 - brevityPenalty * 20);
        const intonationScore = Math.round(35 - brevityPenalty * 15);
        const speechScore = Math.round((paceScore + clarityScore + intonationScore) / 3);
        return NextResponse.json({
          words_per_minute: calculatedWpm,
          filler_words: fillerCount,
          filler_word_list: fillerList,
          pause_count: 0,
          clarity_score: clarityScore,
          pace_score: paceScore,
          intonation_score: intonationScore,
          speech_score: speechScore,
        } satisfies AnalyzeSpeechResponse);
      }

      const paceScore = calculatedWpm >= 110 && calculatedWpm <= 160 ? 88
        : calculatedWpm >= 80 && calculatedWpm < 110 ? 74
        : calculatedWpm > 160 && calculatedWpm <= 200 ? 70
        : 55;
      const clarityScore = Math.max(40, Math.min(96, 94 - fillerCount * 3));
      const intonationScore = Math.min(90, Math.max(55, 70 + Math.min(15, Math.round(wordCount / 20))));
      const speechScore = Math.round((paceScore + clarityScore + intonationScore) / 3);

      const mockResponse: AnalyzeSpeechResponse = {
        words_per_minute: calculatedWpm,
        filler_words: fillerCount,
        filler_word_list: fillerList,
        pause_count: Math.max(1, Math.round(minutes * 2)),
        clarity_score: clarityScore,
        pace_score: paceScore,
        intonation_score: intonationScore,
        speech_score: speechScore,
      };

      return NextResponse.json(mockResponse);
    }

    const prompt = `You are an expert speech and phonetics analyst evaluating a live presentation speech transcript.
Transcript:
"${transcript.slice(0, 4000)}"
Duration (seconds): ${duration}
Total word count: ${wordCount}
Presenter language: ${language}

IMPORTANT INSTRUCTIONS:
1. "filler_words": Carefully count ALL filler words, vocalized pauses, and verbal crutches present in the transcript (e.g. Indonesian: "eh", "ee", "eee", "anu", "kayak", "kayaknya", "gitu", "jadi", "terus", "nah", "kan", "apa namanya", "hmm", "pokoknya", "sebenarnya"; English: "um", "uh", "like", "you know", "basically", "actually", "sort of", "er").
2. "filler_word_list": Unique list of the detected filler words (e.g. ["eee", "kayak", "anu"]).
3. If the transcript is empty or has very few words (< 15), presenter did not speak: give speech_score < 15, clarity_score < 15, pace_score < 10, intonation_score < 10, words_per_minute = ${calculatedWpm}.
4. "words_per_minute": ${calculatedWpm}.
5. "clarity_score": 0-100 (penalize 3-5 points per filler word, reward crisp articulation).
6. "pace_score": 0-100 (120-150 WPM optimal).
7. "intonation_score": 0-100.
8. "speech_score": weighted average of pace, clarity, intonation.

Return strictly valid JSON (DO NOT include any text outside the JSON):
{
  "words_per_minute": number,
  "filler_words": number,
  "filler_word_list": ["string"],
  "pause_count": number,
  "clarity_score": number,
  "pace_score": number,
  "intonation_score": number,
  "speech_score": number
}`;

    const completion = await createGroqChatCompletion({
      model: AI_MODEL || DEFAULT_FREE_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const rawContent = completion.choices[0]?.message?.content ?? '{}';
    let cleanJson = rawContent.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);

    // Always trust the local regex-based filler detection over the LLM's own count —
    // it's deterministic, doesn't depend on the model following instructions, and the
    // LLM frequently reports 0 even when filler words are clearly present in the transcript.
    parsed.filler_words = fillerCount;
    parsed.filler_word_list = fillerList;

    return NextResponse.json(parsed);

  } catch (error) {
    console.error('Error in analyze-speech:', error);
    if (isOpenAIQuotaError(error)) {
      console.warn('[analyze-speech] Fallback to local computation.');
      try {
        const body2 = await req.json().catch(() => ({})) as AnalyzeSpeechRequest;
        const t2 = (body2.transcript ?? '').trim();
        const w2 = t2.split(/\s+/).filter(Boolean);
        const wc2 = w2.length;
        const m2 = Math.max(0.1, (body2.duration ?? 60) / 60);
        const wpm2 = wc2 === 0 ? 0 : Math.round(wc2 / m2);

        if (wc2 === 0) {
          return NextResponse.json({ words_per_minute: 0, filler_words: 0, filler_word_list: [], pause_count: 0, clarity_score: 10, pace_score: 5, intonation_score: 5, speech_score: 8 } satisfies AnalyzeSpeechResponse);
        }

        const { count: fc2, list: fl2 } = extractFillers(t2, body2.language ?? 'id');
        const pc2 = Math.max(1, Math.round(m2 * 2));
        const cl2 = Math.max(40, Math.min(96, 94 - fc2 * 3));
        const ps2 = wpm2 >= 110 && wpm2 <= 160 ? 88 : wpm2 >= 80 ? 74 : 55;
        const in2 = Math.min(90, Math.max(55, 70 + Math.min(15, Math.round(wc2 / 20))));
        const sp2 = Math.round((ps2 + cl2 + in2) / 3);
        return NextResponse.json({
          words_per_minute: wpm2, filler_words: fc2,
          filler_word_list: fl2,
          pause_count: pc2, clarity_score: cl2, pace_score: ps2,
          intonation_score: in2, speech_score: sp2,
        } satisfies AnalyzeSpeechResponse);
      } catch {
        return NextResponse.json({ words_per_minute: 0, filler_words: 0, filler_word_list: [], pause_count: 0, clarity_score: 10, pace_score: 5, intonation_score: 5, speech_score: 8 } satisfies AnalyzeSpeechResponse);
      }
    }
    return NextResponse.json(
      { error: 'Failed to analyze speech' },
      { status: 500 }
    );
  }
}
