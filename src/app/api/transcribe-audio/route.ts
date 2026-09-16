import { NextRequest, NextResponse } from 'next/server';
import { toFile } from 'openai/uploads';
import { openai, isOpenAIConfigured } from '@/lib/openai/client';

// Needs the Node runtime (Buffer, and the openai SDK's upload helpers) — not Edge.
export const runtime = 'nodejs';

// Groq's Whisper model — transcribes VERBATIM (including "eee", "umm", "anu", etc.), unlike
// the browser's Web Speech API which auto-cleans disfluencies before returning text. This is
// the authoritative transcript source for filler-word detection and scoring.
const WHISPER_MODEL = 'whisper-large-v3';

export interface TranscribeAudioResponse {
  transcript: string;
  _source: 'whisper' | 'unavailable' | 'empty' | 'error';
}

export async function POST(req: NextRequest) {
  try {
    if (!isOpenAIConfigured) {
      return NextResponse.json({ transcript: '', _source: 'unavailable' } satisfies TranscribeAudioResponse);
    }

    const formData = await req.formData();
    const audio = formData.get('audio');
    const language = formData.get('language') === 'en' ? 'en' : 'id';

    if (!audio || !(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json({ transcript: '', _source: 'empty' } satisfies TranscribeAudioResponse);
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const file = await toFile(buffer, 'recording.webm', {
      type: (audio as File).type || 'audio/webm',
    });

    const result = await openai.audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      language,
      response_format: 'json',
      temperature: 0,
    });

    return NextResponse.json({
      transcript: (result.text ?? '').trim(),
      _source: 'whisper',
    } satisfies TranscribeAudioResponse);
  } catch (error) {
    console.error('Error in transcribe-audio:', error);
    // Fail soft — the room page falls back to the browser's live captions transcript.
    return NextResponse.json({ transcript: '', _source: 'error' } satisfies TranscribeAudioResponse);
  }
}
