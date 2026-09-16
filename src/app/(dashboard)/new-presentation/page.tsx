'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { FileUploader } from '@/components/ui/FileUploader';
import { DemoBanner } from '@/components/ui/States';
import { isDemoMode } from '@/lib/config';
import { generateId } from '@/lib/utils';
import { addPresentation } from '@/lib/mock/data';
import { createPresentation } from '@/lib/supabase/data';
import { saveMaterial } from '@/lib/material-storage';
import type { CreatePresentationForm, Presentation, ExaminerType, Difficulty, PresentationLanguage } from '@/types';
import {
  ChevronRight, ChevronLeft, Loader2, Presentation as PresentIcon,
  Clock, Globe, Users, Zap, HelpCircle, Minus, Plus, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const EXAMINERS = [
  { value: 'teacher', icon: '👩‍🏫', labelId: 'Guru', labelEn: 'Teacher' },
  { value: 'lecturer', icon: '👨‍💼', labelId: 'Dosen', labelEn: 'Lecturer' },
  { value: 'competition_judge', icon: '🏆', labelId: 'Juri Kompetisi', labelEn: 'Competition Judge' },
  { value: 'hr_interviewer', icon: '💼', labelId: 'HR Interviewer', labelEn: 'HR Interviewer' },
  { value: 'general_audience', icon: '👥', labelId: 'Audiens Umum', labelEn: 'General Audience' },
];

const DIFFICULTIES = [
  { value: 'easy', labelId: 'Mudah', labelEn: 'Easy', desc_id: 'Pertanyaan dasar & feedback ringan', desc_en: 'Basic questions & light feedback', color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' },
  { value: 'medium', labelId: 'Sedang', labelEn: 'Medium', desc_id: 'Pertanyaan menengah & analisis mendalam', desc_en: 'Intermediate questions & in-depth analysis', color: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800' },
  { value: 'hard', labelId: 'Sulit', labelEn: 'Hard', desc_id: 'Pertanyaan mendalam & standar profesional', desc_en: 'Deep questions & professional standards', color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' },
];

const LANG_OPTIONS = [
  { value: 'id', label: '🇮🇩 Bahasa Indonesia' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'auto', label: '🌐 Auto Detect' },
];

type UploadedMaterial = {
  fileContent: string;
  fileType: 'pdf' | 'pptx' | 'docx' | 'text';
  slideImages?: string[][];
  fileData?: string;
  slideCount?: number;
  pageImages?: string[];
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function readUploadedFileText(file: File): Promise<UploadedMaterial> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      // pdfjs refuses to run at all without this — getDocument() throws immediately,
      // which silently degraded every PDF upload to just its filename (no text, no pages).
      // Served as a plain static file (public/pdf.worker.min.mjs) rather than bundled via
      // `new URL(..., import.meta.url)` — Next's production build runs Terser on anything
      // webpack bundles this way, and Terser can't parse the worker's ESM import/export
      // syntax, which broke the Vercel build entirely.
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

      const pageTexts: string[] = [];
      const pageImages: string[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ');
        pageTexts.push(pageText);

        // Render the actual page to an image so the Room can show the real page —
        // matching the PPTX viewer instead of falling back to reflowed bullet text.
        try {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            pageImages.push(canvas.toDataURL('image/jpeg', 0.85));
          }
        } catch {
          // If rendering a page fails, the viewer just falls back to text for that upload.
        }
      }

      // Blank line between pages (not a single \n) so any text-based fallback splits
      // per page instead of collapsing the whole document into one block.
      const extractedText = pageTexts.join('\n\n').trim();

      return {
        fileContent: extractedText || file.name,
        fileType: 'pdf',
        pageImages: pageImages.length === pdf.numPages ? pageImages : undefined,
        slideCount: pdf.numPages,
      };
    } catch {
      return {
        fileContent: file.name,
        fileType: 'pdf',
      };
    }
  }

  if (file.type.includes('presentation') || file.name.toLowerCase().endsWith('.pptx')) {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const slideFiles = Object.keys(zip.files)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
        .sort();

      const texts: string[] = [];
      const slideImages: string[][] = [];
      for (const slideName of slideFiles) {
        const xml = zip.files[slideName];
        if (!xml) {
          texts.push('');
          slideImages.push([]);
          continue;
        }

        const xmlContent = await xml.async('string');
        const matches = xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/g) ?? [];
        const text = matches
          .map((match) => match
            .replace(/<a:t[^>]*>/g, '')
            .replace(/<\/a:t>/g, ''))
          .map((value) => value
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'"))
          .join(' ')
          .trim();

        texts.push(text);

        const slideNumber = slideName.match(/slide(\d+)\.xml/i)?.[1];
        const relationships = slideNumber
          ? zip.files[`ppt/slides/_rels/slide${slideNumber}.xml.rels`]
          : undefined;
        const images: string[] = [];
        if (relationships) {
          const relsXml = await relationships.async('string');
          const imageTargets = [...relsXml.matchAll(/<Relationship[^>]+Id="(rId\d+)"[^>]+Target="([^"]+)"[^>]*\/>/g)]
            .filter((match) => /image/i.test(match[2]));
          for (const [, relationshipId, target] of imageTargets) {
            if (!xmlContent.includes(`r:embed="${relationshipId}"`)) continue;
            const imageTarget = target.replace(/^\/+/, '').replace(/^\.\.\//, '');
            const imagePath = imageTarget.startsWith('ppt/') ? imageTarget : `ppt/${imageTarget}`;
            const imageFile = zip.files[imagePath];
            if (!imageFile) continue;
            const extension = imagePath.split('.').pop()?.toLowerCase() || 'png';
            const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : `image/${extension}`;
            images.push(`data:${mimeType};base64,${await imageFile.async('base64')}`);
          }
        }
        slideImages.push(images.slice(0, 3));
      }

      const fileContent = texts.join('\n\n').trim() || file.name;
      return {
        fileContent,
        fileType: 'pptx',
        slideImages,
        fileData: arrayBufferToBase64(await file.arrayBuffer()),
        slideCount: slideFiles.length,
      };
    } catch {
      return {
        fileContent: file.name,
        fileType: 'pptx',
      };
    }
  }

  if (file.name.toLowerCase().endsWith('.docx')) {
    try {
      const { extractRawText } = await import('mammoth');
      const result = await extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return {
        fileContent: result.value.trim() || file.name,
        fileType: 'docx',
      };
    } catch {
      return {
        fileContent: file.name,
        fileType: 'docx',
      };
    }
  }

  if (file.name.toLowerCase().endsWith('.ppt')) {
    throw new Error(
      'Format .ppt (versi lama) tidak didukung. Silakan buka file di PowerPoint atau Google Slides dan simpan sebagai .pptx atau .pdf.'
    );
  }

  const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
  throw new Error(
    `Format file ${ext || ''} tidak didukung. Format yang didukung: PDF, PPTX, DOCX.`
  );
}

export default function NewPresentationPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<CreatePresentationForm>({
    defaultValues: {
      // Pre-fill with the system language already chosen in Settings — the user can still
      // override it per-presentation via the dropdown below (registered normally, unchanged).
      language,
      examiner: 'general_audience',
      difficulty: 'medium',
      duration: 15,
      question_count_mode: 'auto',
      custom_question_count: 3,
    },
  });

  // Keeps the presentation-language field synced to the Settings-configured system language
  // even on a hard page reload — where LanguageContext hydrates from localStorage AFTER this
  // form's defaultValues were already captured, so the field would otherwise briefly default
  // back to 'id'. Skipped once the user has manually picked a language for this form.
  const userTouchedLanguageRef = useRef(false);
  useEffect(() => {
    if (!userTouchedLanguageRef.current) {
      setValue('language', language);
    }
  }, [language, setValue]);

  const selectedExaminer = watch('examiner');
  const selectedDifficulty = watch('difficulty');
  const selectedLang = watch('language');
  const selectedQuestionMode = watch('question_count_mode') || 'auto';
  const customQuestionCount = watch('custom_question_count') || 3;

  const onSubmit = async (data: CreatePresentationForm) => {
    if (isSubmitting) return;

    if (!selectedFile) {
      toast.error(
        language === 'id'
          ? 'File materi presentasi wajib diunggah sebelum melanjutkan!'
          : 'Presentation material file is required before proceeding!'
      );
      return;
    }

    if (!data.title.trim()) {
      toast.error(language === 'id' ? 'Judul presentasi wajib diisi' : 'Presentation title is required');
      return;
    }
    setIsSubmitting(true);

    try {
      let material = null as null | UploadedMaterial & { fileName?: string };
      if (selectedFile) {
        material = await readUploadedFileText(selectedFile);
      }

      const title = data.title.trim() || (selectedFile?.name ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'Presentasi Baru');
      const fileUrl = selectedFile ? URL.createObjectURL(selectedFile) : undefined;

      let presentationId: string;

      if (isDemoMode) {
        // Demo mode has no real Supabase account to attach data to — keep the original
        // localStorage-based flow so the demo experience still works standalone.
        presentationId = generateId();
        const presentation: Presentation = {
          id: presentationId,
          user_id: user?.id ?? 'demo',
          title,
          description: data.description,
          file_url: fileUrl as unknown as string,
          file_name: selectedFile?.name,
          language: data.language as PresentationLanguage,
          duration: data.duration,
          examiner: data.examiner as ExaminerType,
          difficulty: data.difficulty as Difficulty,
          question_count_mode: data.question_count_mode || 'auto',
          custom_question_count: Number(data.custom_question_count) || 3,
          created_at: new Date().toISOString(),
        };
        addPresentation(presentation);
      } else {
        // Real account: persist to Supabase (RLS-scoped to this user) instead of the shared
        // browser localStorage — this is what previously made every account see the same
        // "history", since localStorage isn't tied to which account is logged in.
        // NOTE: question_count_mode/custom_question_count aren't columns in the `presentations`
        // table yet (would need a DB migration), so they aren't persisted for real accounts —
        // the app already falls back to 'auto'/3 wherever they're read, so this degrades safely.
        const created = await createPresentation({
          title,
          description: data.description,
          file_url: fileUrl as unknown as string,
          file_name: selectedFile?.name,
          language: data.language as PresentationLanguage,
          duration: data.duration,
          examiner: data.examiner as ExaminerType,
          difficulty: data.difficulty as Difficulty,
        });
        presentationId = created.id;
      }

      if (material && typeof window !== 'undefined') {
        await saveMaterial(`presentai-material-${presentationId}`, {
          fileContent: material.fileContent,
          fileType: material.fileType,
          fileName: selectedFile?.name,
          slideImages: material.slideImages,
          fileData: material.fileData,
          slideCount: material.slideCount,
          pageImages: material.pageImages,
        });
      }

      toast.success(language === 'id' ? 'Presentasi dibuat!' : 'Presentation created!');
      router.push(`/presentations/${presentationId}/analyze`);
    } catch (error) {
      toast.error(error instanceof Error && error.message
        ? error.message
        : language === 'id' ? 'Gagal membuat presentasi' : 'Failed to create presentation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {t('presentation.create')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {language === 'id'
            ? 'Isi detail presentasimu dan unggah materi untuk dianalisis AI'
            : 'Fill in your presentation details and upload material for AI analysis'}
        </p>
      </div>

      {isDemoMode && <div className="mb-6"><DemoBanner /></div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <PresentIcon className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              {language === 'id' ? 'Informasi Dasar' : 'Basic Information'}
            </h2>
          </div>

          <div>
            <label htmlFor="title" className="label">{t('presentation.title')} *</label>
            <input
              id="title"
              type="text"
              className="input"
              placeholder={language === 'id' ? 'Contoh: Kecerdasan Buatan dalam Pendidikan' : 'e.g., Artificial Intelligence in Education'}
              {...register('title', { required: true })}
            />
          </div>

          <div>
            <label htmlFor="description" className="label">{t('presentation.description')}</label>
            <textarea
              id="description"
              rows={3}
              className="input resize-none"
              placeholder={language === 'id' ? 'Deskripsi singkat tentang presentasimu...' : 'Brief description about your presentation...'}
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="duration" className="label">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                {t('presentation.duration')}
              </label>
              <input
                id="duration"
                type="number"
                min={1}
                max={120}
                className="input"
                {...register('duration', { valueAsNumber: true })}
              />
            </div>
            <div>
              <label htmlFor="lang" className="label">
                <Globe className="w-3.5 h-3.5 inline mr-1" />
                {t('presentation.language')}
              </label>
              <select
                id="lang"
                className="input"
                {...register('language', { onChange: () => { userTouchedLanguageRef.current = true; } })}
              >
                {LANG_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              {t('presentation.uploadFile')} <span className="text-red-500">*</span>
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
              {language === 'id' ? 'Wajib Diunggah' : 'Required'}
            </span>
          </div>
          <FileUploader
            onFileSelected={(file) => {
              setSelectedFile(file);
              const currentTitle = watch('title');
              if (!currentTitle || currentTitle.trim() === '') {
                const cleanName = file.name.replace(/\.[^/.]+$/, '');
                setValue('title', cleanName);
              }
            }}
            onFileRemoved={() => setSelectedFile(null)}
          />
        </div>

        {/* Examiner */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('presentation.examiner')}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {EXAMINERS.map((e) => (
              <button
                key={e.value}
                type="button"
                onClick={() => setValue('examiner', e.value as ExaminerType)}
                className={cn(
                  'p-3 rounded-xl border-2 text-left transition-all',
                  selectedExaminer === e.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
                )}
              >
                <div className="text-2xl mb-1">{e.icon}</div>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {language === 'id' ? e.labelId : e.labelEn}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('presentation.difficulty')}</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setValue('difficulty', d.value as Difficulty)}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  selectedDifficulty === d.value ? d.color : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                )}
              >
                <p className="text-sm font-bold mb-1">
                  {language === 'id' ? d.labelId : d.labelEn}
                </p>
                <p className="text-xs opacity-70">
                  {language === 'id' ? d.desc_id : d.desc_en}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Question Count Setting */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-brand-500" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {language === 'id' ? 'Banyaknya Pertanyaan Tanya Jawab (Q&A)' : 'Number of Q&A Questions'}
              </h2>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {language === 'id' ? 'Penguji AI' : 'AI Examiner'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Auto Mode Option */}
            <button
              type="button"
              onClick={() => setValue('question_count_mode', 'auto')}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all relative',
                selectedQuestionMode === 'auto'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-500" />
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {language === 'id' ? 'Otomatis Sesuai Materi' : 'Auto (Based on Presentation)'}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                  {language === 'id' ? 'Rekomendasi' : 'Recommended'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {language === 'id'
                  ? 'AI menentukan jumlah pertanyaan ideal secara cerdas berdasarkan jumlah slide dan durasi presentasi (2–5 pertanyaan).'
                  : 'AI intelligently determines ideal question count based on slide count and duration (2–5 questions).'}
              </p>
            </button>

            {/* Custom Mode Option */}
            <button
              type="button"
              onClick={() => setValue('question_count_mode', 'custom')}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                selectedQuestionMode === 'custom'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <HelpCircle className="w-4 h-4 text-brand-500" />
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {language === 'id' ? 'Atur Sendiri (Kustom)' : 'Custom Quantity'}
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {language === 'id'
                  ? 'Tentukan secara spesifik berapa banyak pertanyaan yang ingin diajukan oleh penguji AI (1–10 pertanyaan).'
                  : 'Specify exact number of questions you want the AI examiner to ask (1–10 questions).'}
              </p>
            </button>
          </div>

          {/* Custom Question Counter / Quick Buttons (When Custom is selected) */}
          {selectedQuestionMode === 'custom' && (
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-200/80 dark:border-gray-800">
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    {language === 'id' ? 'Jumlah Pertanyaan yang Diajukan:' : 'Questions to Generate:'}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {language === 'id' ? 'Pilih antara 1 sampai 10 pertanyaan' : 'Choose between 1 to 10 questions'}
                  </p>
                </div>

                {/* Interactive Counter */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setValue('custom_question_count', Math.max(1, customQuestionCount - 1))}
                    disabled={customQuestionCount <= 1}
                    className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-14 text-center font-bold font-mono text-base text-brand-600 dark:text-brand-400">
                    {customQuestionCount}
                  </span>

                  <button
                    type="button"
                    onClick={() => setValue('custom_question_count', Math.min(10, customQuestionCount + 1))}
                    disabled={customQuestionCount >= 10}
                    className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Preset Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mr-1">
                  {language === 'id' ? 'Pilihan Cepat:' : 'Quick Select:'}
                </span>
                {[1, 2, 3, 5, 7, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setValue('custom_question_count', num)}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border',
                      customQuestionCount === num
                        ? 'bg-brand-500 text-white border-brand-500 font-semibold'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-300'
                    )}
                  >
                    {num} {language === 'id' ? 'soal' : 'questions'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}</>
            ) : (
              <>{t('presentation.analyzeButton')} <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
