'use client';

import { useRef, useState } from 'react';
import { analyzeIntonation, type IntonationResult } from '@/lib/audio-intonation';

interface SpeechResult {
  words_per_minute: number;
  filler_words: number;
  filler_word_list: string[];
  clarity_score: number;
  pace_score: number;
  intonation_score: number;
  speech_score: number;
}

export default function TestSpeechAnalysisPage() {
  const [status, setStatus] = useState('Siap. Rekam suara atau upload file audio.');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechResult, setSpeechResult] = useState<SpeechResult | null>(null);
  const [intonationResult, setIntonationResult] = useState<IntonationResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const processBlob = async (blob: Blob, durationSeconds: number) => {
    setStatus('Mentranskripsi & menganalisis…');
    setTranscript('');
    setSpeechResult(null);
    setIntonationResult(null);

    try {
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');
      form.append('language', 'id');
      const transcribeRes = await fetch('/api/transcribe-audio', { method: 'POST', body: form });
      const transcribeData = await transcribeRes.json();
      const t = transcribeData.transcript || '';
      setTranscript(t || '(tidak ada transkrip / kosong)');

      const speechRes = await fetch('/api/analyze-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: t, duration: Math.max(1, durationSeconds), language: 'id' }),
      });
      const speechData = await speechRes.json();
      setSpeechResult(speechData);

      const intonation = await analyzeIntonation(blob);
      setIntonationResult(intonation);

      setStatus('Selesai.');
    } catch (err) {
      setStatus('ERROR: ' + String(err));
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
        processBlob(blob, durationSeconds);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setStatus('Merekam… klik "Stop" saat selesai bicara.');
    } catch (err) {
      setStatus('Gagal akses mikrofon: ' + String(err));
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Duration unknown from a plain file upload — estimate is not needed for intonation,
    // and WPM will just use a nominal 30s (informational only, this is a quick test tool).
    processBlob(file, 30);
  };

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto', fontFamily: 'system-ui', color: '#111' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Uji Analisis Suara (WPM, Filler, Intonasi)</h1>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
        Alat sementara untuk menguji fitur analisis suara tanpa perlu proses presentasi lengkap.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {!isRecording ? (
          <button onClick={startRecording} style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
            🎙️ Mulai Rekam
          </button>
        ) : (
          <button onClick={stopRecording} style={{ padding: '10px 20px', background: '#dc2626', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
            ⏹ Stop
          </button>
        )}
        <label style={{ padding: '10px 20px', background: '#e5e7eb', borderRadius: 8, cursor: 'pointer' }}>
          📁 Upload File Audio
          <input type="file" accept="audio/*" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>

      <p style={{ fontSize: 13, color: '#444', marginBottom: 20 }}>Status: {status}</p>

      {transcript && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 8, fontSize: 13 }}>
          <strong>Transkrip:</strong> {transcript}
        </div>
      )}

      {speechResult && (
        <div style={{ marginBottom: 16, padding: 12, background: '#eff6ff', borderRadius: 8, fontSize: 13 }}>
          <strong>Hasil analyze-speech:</strong>
          <ul>
            <li>WPM: {speechResult.words_per_minute}</li>
            <li>Kata pengisi: {speechResult.filler_words} ({speechResult.filler_word_list?.join(', ') || '-'})</li>
            <li>Clarity: {speechResult.clarity_score}</li>
            <li>Pace: {speechResult.pace_score}</li>
            <li>Intonation (jalur teks/lama): {speechResult.intonation_score}</li>
            <li>Speech score: {speechResult.speech_score}</li>
          </ul>
        </div>
      )}

      {intonationResult ? (
        <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, fontSize: 13 }}>
          <strong>Hasil analisis pitch asli (yang baru):</strong>
          <ul>
            <li>Skor intonasi (dari suara asli): {intonationResult.score}</li>
            <li>Standar deviasi pitch: {intonationResult.pitchStdDevHz} Hz</li>
            <li>Rata-rata pitch: {intonationResult.meanPitchHz} Hz</li>
            <li>Jumlah frame bersuara: {intonationResult.voicedFrameCount}</li>
          </ul>
        </div>
      ) : (
        speechResult && <p style={{ fontSize: 12, color: '#999' }}>(Analisis pitch: null — audio terlalu pendek/hening untuk dinilai)</p>
      )}
    </div>
  );
}
