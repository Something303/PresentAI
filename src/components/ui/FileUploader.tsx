'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  onFileRemoved?: () => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

export function FileUploader({
  onFileSelected,
  onFileRemoved,
  accept = '.pdf,.pptx,.docx',
  maxSizeMB = 50,
  className,
}: FileUploaderProps) {
  const { t, language } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const validateAndSelect = useCallback(
    (file: File) => {
      setError('');
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        const msg = language === 'en'
          ? `File is too large. Maximum allowed size is ${maxSizeMB}MB.`
          : `File terlalu besar. Ukuran maksimal adalah ${maxSizeMB}MB.`;
        setError(msg);
        toast.error(msg);
        if (inputRef.current) inputRef.current.value = '';
        return;
      }

      // Deteksi format .ppt (lawas) untuk memberikan instruksi yang jelas
      if (file.name.toLowerCase().endsWith('.ppt')) {
        const msg = language === 'en'
          ? 'Legacy .ppt format is not supported. Please open your presentation in PowerPoint or Google Slides and save it as .pptx or .pdf.'
          : 'Format .ppt (versi lama) tidak didukung. Silakan buka file di PowerPoint atau Google Slides, lalu simpan sebagai .pptx atau .pdf.';
        setError(msg);
        toast.error(msg, { duration: 5000 });
        if (inputRef.current) inputRef.current.value = '';
        return;
      }

      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|pptx|docx)$/i)) {
        const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
        const msg = language === 'en'
          ? `Format ${ext || 'file'} is not supported. Supported formats: PDF, PPTX, DOCX.`
          : `Format ${ext || 'file'} tidak didukung. Format yang didukung: PDF, PPTX, DOCX.`;
        setError(msg);
        toast.error(msg);
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
      setSelectedFile(file);
      onFileSelected(file);
    },
    [language, maxSizeMB, onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect]
  );

  const removeFile = () => {
    setSelectedFile(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
    onFileRemoved?.();
  };

  if (selectedFile) {
    return (
      <div className={cn('card p-4 flex items-center gap-3', className)}>
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {selectedFile.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        <button
          type="button"
          onClick={removeFile}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Remove file"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragging
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
            : 'border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-gray-900/50',
          error && 'border-red-300 dark:border-red-700'
        )}
      >
        <Upload
          className={cn(
            'w-10 h-10 mx-auto mb-3 transition-colors',
            isDragging ? 'text-brand-500' : 'text-gray-400'
          )}
        />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('presentation.uploadFile')}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('presentation.uploadHint')}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          aria-label="Upload file"
        />
      </div>
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}
    </div>
  );
}
