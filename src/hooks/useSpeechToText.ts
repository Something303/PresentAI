'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Language } from '@/types';

// SpeechRecognition global types
interface ISpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface ISpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onerror: (event: ISpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface UseSpeechToTextProps {
  language?: Language;
  isSimulated?: boolean;
}

interface UseSpeechToTextReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  appendTranscript: (text: string) => void;
  wordsCount: number;
}

export function useSpeechToText({
  language = 'id',
}: UseSpeechToTextProps = {}): UseSpeechToTextReturn {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecClass =
      (window as unknown as { SpeechRecognition?: new () => ISpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => ISpeechRecognitionInstance }).webkitSpeechRecognition;

    if (SpeechRecClass) {
      setIsSupported(true);
      const recognition = new SpeechRecClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'id' ? 'id-ID' : 'en-US';

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            final += res[0].transcript + ' ';
          } else {
            interim += res[0].transcript;
          }
        }

        if (final) {
          setTranscript((prev) => (prev ? `${prev} ${final.trim()}` : final.trim()));
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition notice/error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsListening(false);
          isListeningRef.current = false;
        }
      };

      recognition.onend = () => {
        // Auto-restart if listening flag is still true (browser continuous stops occasionally)
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            // ignore
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        isListeningRef.current = false;
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [language]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setIsListening(true);
      isListeningRef.current = true;
      return;
    }

    try {
      isListeningRef.current = true;
      setIsListening(true);
      recognitionRef.current.start();
    } catch {
      // already started
    }
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const appendTranscript = useCallback((text: string) => {
    setTranscript((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  const wordsCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    appendTranscript,
    wordsCount,
  };
}
