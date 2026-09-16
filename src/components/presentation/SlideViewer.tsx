'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileText,
  StickyNote,
  Sliders,
  Edit3,
  Check,
  Info,
  Sparkles,
  X,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { OriginalPptxViewer } from './OriginalPptxViewer';
import { PageImageViewer } from './PageImageViewer';
import type { Language } from '@/types';

// Builds a compact page list with ellipses (e.g. "1 … 6 7 [8] 9 10 … 15") so the slide
// navigator stays a fixed, tidy width no matter how many slides there are — previously every
// single slide got its own button, which overflowed/crowded "Previous"/"Next" once a deck
// had more than ~8-10 slides.
function getVisiblePageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  const delta = 1; // neighbors shown on each side of the current slide
  const range: number[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  const withDots: (number | 'ellipsis')[] = [];
  let last: number | undefined;
  for (const i of range) {
    if (last !== undefined) {
      if (i - last === 2) {
        withDots.push(last + 1); // single skipped page — show it instead of "…"
      } else if (i - last > 2) {
        withDots.push('ellipsis');
      }
    }
    withDots.push(i);
    last = i;
  }
  return withDots;
}

interface SlideItem {
  number: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  images?: string[];
  notes?: string;
}

interface SlideViewerProps {
  title?: string;
  materialText?: string;
  slideImages?: string[][];
  fileData?: string;
  pageImages?: string[];
  originalSlidesCount?: number;
  currentSlide: number;
  onSlideChange: (slideNumber: number) => void;
  slidesCount?: number;
  presentationId?: string;
  language?: Language;
}

export function SlideViewer({
  title = 'Presentation Slides',
  materialText = '',
  slideImages = [],
  fileData = '',
  pageImages = [],
  originalSlidesCount,
  currentSlide,
  onSlideChange,
  slidesCount = 6,
  presentationId = 'default',
  language = 'id',
}: SlideViewerProps) {
  const isIndo = language === 'id';
  const [showNotes, setShowNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Mock presentation slides with high quality content
  const mockSlides: SlideItem[] = [
    {
      number: 1,
      title: 'Kecerdasan Buatan dalam Pendidikan Modern',
      subtitle: 'Transformasi Pedagogi Menuju Pembelajaran Adaptif dan Personal',
      bullets: [
        'Evolusi teknologi pembelajaran dari konvensional ke digital berbasis data',
        'Peluang dan potensi akselerasi pemahaman siswa dengan AI',
        'Tinjauan komprehensif agenda presentasi hari ini',
      ],
      notes: 'Sampaikan salam pembuka dengan hangat. Berikan gambaran singkat durasi presentasi dan tujuan utama yang ingin dicapai bersama audiens.',
    },
    {
      number: 2,
      title: 'Tantangan Pembelajaran Konvensional',
      subtitle: 'Keterbatasan Skalabilitas Pendampingan Satu-ke-Satu',
      bullets: [
        'Rasio guru dan murid yang belum seimbang memicu kesenjangan pemahaman materi',
        'Kurangnya umpan balik seketika (real-time feedback) dalam tugas latihan',
        'Tingkat kebosanan materi akibat materi yang tidak disesuaikan dengan kecepatan belajar siswa',
      ],
      notes: 'Tunjukkan empati terhadap beban pengajar saat ini. Beri penekanan pada kata kunci "Kesenjangan Pemahaman".',
    },
    {
      number: 3,
      title: 'Solusi: Sistem Pembelajaran Berbasis AI',
      subtitle: 'Personalisasi Skala Besar Melalui Algoritma Cerdas',
      bullets: [
        'Deteksi kelemahan konsep materi secara otomatis dan akurat',
        'Rekomendasi kurikulum adaptif sesuai kecepatan tangkap setiap individu',
        'Asisten virtual 24/7 untuk menjawab keraguan siswa tanpa rasa canggung',
      ],
      notes: 'Gunakan gestur tangan terbuka saat menjelaskan 3 pilar solusi ini untuk memberikan kesan keyakinan yang mantap.',
    },
    {
      number: 4,
      title: 'Bukti Dampak & Studi Kasus',
      subtitle: 'Peningkatan Hasil Evaluasi dan Retensi Belajar',
      bullets: [
        'Peningkatan skor pemahaman rata-rata sebesar 38% dalam periode 3 bulan',
        'Keterlibatan aktif siswa meningkat hingga 2.4x dibandingkan kelas pasif',
        'Efisiensi waktu koreksi evaluasi pengajar berkurang hingga 60%',
      ],
      notes: 'Sebutkan angka 38% dan 2.4x dengan artikulasi tegas dan tatap langsung kamera.',
    },
    {
      number: 5,
      title: 'Etika & Privasi Data Siswa',
      subtitle: 'Menjaga Keamanan dan Menghindari Algorithmic Bias',
      bullets: [
        'Kepatuhan ketat terhadap regulasi perlindungan data pribadi siswa',
        'Audit transparansi model AI untuk mencegah bias demografis',
        'Peran pengajar sebagai penentu keputusan akhir (Human-in-the-Loop)',
      ],
      notes: 'Tegaskan bahwa AI tidak menggantikan empati dan kepemimpinan moral seorang pendidik.',
    },
    {
      number: 6,
      title: 'Kesimpulan & Langkah Nyata',
      subtitle: 'Kolaborasi Manusia dan Mesin Menuju Masa Depan Gemilang',
      bullets: [
        'AI adalah katalisator penguat peran pengajar, bukan pengganti',
        'Investasi pada literasi digital institusi menjadi prioritas utama',
        'Membuka sesi tanya jawab bersama rekan-rekan audiens',
      ],
      notes: 'Tutup presentasi dengan kesimpulan yang menginspirasi. Ucapkan terima kasih dan persilakan audiens untuk bertanya.',
    },
  ];

  const MAX_NOTE_LENGTH = 200;
  const [customNotes, setCustomNotes] = useState<{ [slideNum: number]: string }>({});
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [tempNoteText, setTempNoteText] = useState('');

  // Load custom notes from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`presentai_speaker_notes_${presentationId}`);
        if (saved) {
          setCustomNotes(JSON.parse(saved));
        }
      } catch (err) {
        console.warn('Failed to parse saved speaker notes', err);
      }
    }
  }, [presentationId]);

  const handleSaveNote = () => {
    const trimmed = tempNoteText.slice(0, MAX_NOTE_LENGTH).trim();
    const updated = { ...customNotes, [currentSlide]: trimmed };
    setCustomNotes(updated);
    setIsEditingNote(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`presentai_speaker_notes_${presentationId}`, JSON.stringify(updated));
      } catch {}
    }
  };

  const uploadedSlides: SlideItem[] = materialText
    .split(/\n\s*\n/)
    .map((section, index) => {
      const lines = section.split('\n').map((line) => line.trim()).filter(Boolean);
      const sectionTitle = lines[0] || `Slide ${index + 1}`;
      const bulletSource = lines.slice(1).join(' ').trim() || sectionTitle;
      const bullets = bulletSource
        .split(/(?<=[.!?])\s+|\s*;\s*|\s*•\s*/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 5);

      const titleLower = sectionTitle.toLowerCase();
      let defaultCue = isIndo
        ? 'Sampaikan poin utama slide ini dengan artikulasi lugas, percaya diri, dan jaga kontak mata stabil ke arah kamera.'
        : 'Deliver this slide\'s main point with clear articulation, confidence, and steady eye contact with the camera.';
      if (index === 0) {
        defaultCue = isIndo
          ? 'Awali dengan salam hangat dan perkenalkan diri/topik secara berenergi. Jelaskan garis besar apa yang akan dipelajari oleh audiens.'
          : 'Open with a warm greeting and introduce yourself/the topic with energy. Outline what the audience will learn.';
      } else if (titleLower.includes('team') || titleLower.includes('anggota') || titleLower.includes('member')) {
        defaultCue = isIndo
          ? 'Perkenalkan nama dan kontribusi anggota tim dengan nada ramah, artikulasi jelas, serta berikan apresiasi kepada seluruh rekan kerja.'
          : 'Introduce each team member\'s name and contribution warmly, with clear articulation, and give credit to the whole team.';
      } else if (titleLower.includes('masalah') || titleLower.includes('tantangan') || titleLower.includes('problem')) {
        defaultCue = isIndo
          ? 'Gunakan intonasi yang tegas untuk menekankan urgensi masalah. Tatap kamera untuk membangun rasa empati dari audiens/penguji.'
          : 'Use a firm tone to emphasize the urgency of the problem. Look at the camera to build empathy with the audience/examiner.';
      } else if (titleLower.includes('solusi') || titleLower.includes('metode') || titleLower.includes('produk')) {
        defaultCue = isIndo
          ? 'Jelaskan solusi utama dengan tempo teratur. Gunakan gestur tangan terbuka saat memaparkan pilar inovasi Anda.'
          : 'Explain the main solution at a steady pace. Use open-hand gestures while presenting the pillars of your innovation.';
      } else if (index >= 4 || titleLower.includes('kesimpulan') || titleLower.includes('penutup')) {
        defaultCue = isIndo
          ? 'Rangkum kesimpulan esensial dalam 1-2 kalimat kuat, sampaikan terima kasih, dan buka sesi tanya jawab dengan senyum ramah.'
          : 'Summarize the essential conclusion in 1-2 strong sentences, say thank you, and open the Q&A with a friendly smile.';
      }

      return {
        number: index + 1,
        title: sectionTitle.slice(0, 140),
        bullets: bullets.length > 0 ? bullets : [sectionTitle],
        images: slideImages[index] ?? [],
        notes: defaultCue,
      };
    })
    .filter((slide) => slide.title.trim().length > 0);
  const slides = uploadedSlides.length > 0 ? uploadedSlides : mockSlides;
  const visibleSlidesCount = fileData
    ? (originalSlidesCount ?? slidesCount)
    : pageImages.length > 0
      ? pageImages.length
      : (uploadedSlides.length > 0 ? uploadedSlides.length : slidesCount);
  const currentSlideData = slides[currentSlide - 1] || slides[0];
  const activeNote = customNotes[currentSlide] || currentSlideData?.notes || (isIndo
    ? 'Sampaikan poin utama slide ini dengan artikulasi jelas dan tatap kamera.'
    : 'Deliver this slide\'s main point with clear articulation and eye contact with the camera.');

  // Keyboard arrow keys navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (currentSlide < visibleSlidesCount) {
          onSlideChange(currentSlide + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (currentSlide > 1) {
          onSlideChange(currentSlide - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, visibleSlidesCount, onSlideChange]);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync fullscreen state with document fullscreen API
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle ESC key to exit fullscreen fallback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch {
      // Fallback for browsers with restricted Fullscreen API
      setIsFullscreen((prev) => !prev);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] w-screen h-screen rounded-none'
          : 'w-full h-full min-h-[380px] rounded-2xl'
      }`}
    >
      {/* Slide Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-medium text-zinc-200 truncate max-w-[320px]">
            {title || (uploadedSlides.length > 0 ? uploadedSlides[0].title : (isIndo ? 'Slide Presentasi' : 'Presentation Slide'))}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls Bar */}
          <div className="flex items-center gap-0.5 bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-700/60 shadow-sm">
            <button
              type="button"
              onClick={() => setZoom((v) => Math.max(0.7, Number((v - 0.1).toFixed(2))))}
              disabled={zoom <= 0.7}
              className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 rounded hover:bg-zinc-700 transition-colors"
              title={isIndo ? 'Perkecil Slide (-)' : 'Zoom Out (-)'}
              aria-label={isIndo ? 'Perkecil Slide' : 'Zoom Out'}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="px-1.5 py-0.5 text-[11px] font-mono text-zinc-300 hover:text-white rounded hover:bg-zinc-700 transition-colors"
              title={isIndo ? 'Atur Ulang Zoom (100%)' : 'Reset Zoom (100%)'}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((v) => Math.min(1.8, Number((v + 0.1).toFixed(2))))}
              disabled={zoom >= 1.8}
              className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 rounded hover:bg-zinc-700 transition-colors"
              title={isIndo ? 'Perbesar Slide (+)' : 'Zoom In (+)'}
              aria-label={isIndo ? 'Perbesar Slide' : 'Zoom In'}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-colors border ${
              showNotes
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 hover:text-white'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isIndo ? 'Catatan Speaker' : 'Speaker Notes'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
            title={isFullscreen
              ? (isIndo ? 'Keluar Layar Penuh (Esc)' : 'Exit Fullscreen (Esc)')
              : (isIndo ? 'Layar Penuh' : 'Fullscreen')}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Slide Canvas */}
      <div className="relative flex-1 min-h-0 flex flex-col justify-center items-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black overflow-hidden">
        {fileData ? (
          <OriginalPptxViewer fileData={fileData} currentSlide={currentSlide} isFullscreen={isFullscreen} zoom={zoom} />
        ) : pageImages.length > 0 ? (
          <PageImageViewer images={pageImages} currentSlide={currentSlide} isFullscreen={isFullscreen} zoom={zoom} />
        ) : (
        <div
          className="w-full max-w-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-8 rounded-2xl border border-zinc-800/70 shadow-2xl transition-transform duration-150 origin-center overflow-y-auto"
          style={{ transform: zoom !== 1 ? `scale(${zoom})` : undefined }}
        >
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
            Slide {currentSlideData.number}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-snug">
            {currentSlideData.title}
          </h2>

          {currentSlideData.subtitle && (
            <p className="text-sm font-medium text-blue-400/90 mb-6">
              {currentSlideData.subtitle}
            </p>
          )}

          {currentSlideData.images && currentSlideData.images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {currentSlideData.images.map((image, index) => (
                <img
                  key={`${currentSlideData.number}-${index}`}
                  src={image}
                  alt={`Gambar slide ${currentSlideData.number} ${index + 1}`}
                  className="w-full max-h-56 object-contain rounded-lg border border-zinc-700 bg-black/30"
                />
              ))}
            </div>
          )}

          <div className="space-y-3.5">
            {currentSlideData.bullets.map((bullet, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {bullet}
                </p>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Slide Notes Drawer */}
      {showNotes && (
        <div className="px-4 sm:px-6 py-2.5 bg-zinc-900/95 border-t border-zinc-800/80 backdrop-blur-md transition-all">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                <StickyNote className="w-3.5 h-3.5 text-blue-400" />
                {isIndo ? 'Catatan Speaker' : 'Speaker Notes'}
              </div>
              <span className="text-[10px] text-zinc-400 bg-zinc-800/90 px-2 py-0.5 rounded-md border border-zinc-700/50">
                Slide {currentSlide}
              </span>
              <span className="hidden sm:inline text-[11px] text-zinc-500">
                · {isIndo ? 'Pemandu pribadi presenter' : "Presenter's personal guide"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isEditingNote ? (
                <>
                  <span
                    className={`text-[10px] font-mono ${
                      tempNoteText.length >= MAX_NOTE_LENGTH
                        ? 'text-amber-400 font-semibold'
                        : 'text-zinc-500'
                    }`}
                  >
                    {tempNoteText.length}/{MAX_NOTE_LENGTH}
                  </span>
                  <button
                    onClick={() => setIsEditingNote(false)}
                    className="px-2 py-0.5 text-xs text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                  >
                    {isIndo ? 'Batal' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-sm"
                  >
                    <Check className="w-3 h-3" />
                    {isIndo ? 'Simpan' : 'Save'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setTempNoteText(activeNote);
                      setIsEditingNote(true);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700/60"
                    title={isIndo ? 'Sesuaikan catatan untuk slide ini' : 'Customize notes for this slide'}
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowNotes(false)}
                    className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
                    title={isIndo ? 'Tutup Catatan' : 'Close Notes'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {isEditingNote ? (
            <div className="space-y-1">
              <textarea
                value={tempNoteText}
                onChange={(e) => setTempNoteText(e.target.value.slice(0, MAX_NOTE_LENGTH))}
                maxLength={MAX_NOTE_LENGTH}
                placeholder={isIndo
                  ? 'Tulis poin kunci / cue pembicaraan slide ini (maksimal 200 karakter)...'
                  : 'Write key points / speaking cues for this slide (max 200 characters)...'}
                rows={2}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-zinc-950 border border-blue-500/80 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none font-sans"
              />
            </div>
          ) : (
            <div className="px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80 max-h-20 overflow-y-auto">
              <p className="text-xs text-zinc-300 leading-relaxed font-sans select-text">
                {activeNote}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Slide Navigation Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-t border-zinc-800 backdrop-blur-md">
        <button
          onClick={() => onSlideChange(Math.max(1, currentSlide - 1))}
          disabled={currentSlide <= 1}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{isIndo ? 'Sebelumnya' : 'Previous'}</span>
        </button>

        <div className="flex items-center gap-1">
          {getVisiblePageNumbers(currentSlide, visibleSlidesCount).map((page, idx) =>
            page === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className="w-7 h-7 flex items-center justify-center text-xs text-zinc-600 select-none"
              >
                …
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onSlideChange(page)}
                className={`w-7 h-7 flex-shrink-0 rounded-lg text-xs font-semibold transition-all ${
                  page === currentSlide
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onSlideChange(Math.min(visibleSlidesCount, currentSlide + 1))}
          disabled={currentSlide >= visibleSlidesCount}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <span className="hidden sm:inline">{isIndo ? 'Berikutnya' : 'Next'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
