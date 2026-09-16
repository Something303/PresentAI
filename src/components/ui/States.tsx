'use client';

import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw, Inbox, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// ── LoadingState ──────────────────────────────────────────────
interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ message, className, size = 'md' }: LoadingStateProps) {
  const { t } = useLanguage();
  const sizeClasses = {
    sm: { icon: 'w-5 h-5', text: 'text-sm', wrapper: 'py-6' },
    md: { icon: 'w-8 h-8', text: 'text-sm', wrapper: 'py-12' },
    lg: { icon: 'w-12 h-12', text: 'text-base', wrapper: 'py-20' },
  };
  const { icon, text, wrapper } = sizeClasses[size];

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', wrapper, className)}>
      <Loader2 className={cn('text-brand-500 animate-spin', icon)} />
      <p className={cn('text-gray-500 dark:text-gray-400', text)}>
        {message ?? t('common.loading')}
      </p>
    </div>
  );
}

// ── SkeletonCard ──────────────────────────────────────────────
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-5 animate-pulse', className)}>
      <div className="h-4 skeleton rounded w-1/3 mb-4" />
      <div className="h-8 skeleton rounded w-2/3 mb-2" />
      <div className="h-3 skeleton rounded w-full mb-1.5" />
      <div className="h-3 skeleton rounded w-4/5" />
    </div>
  );
}

export function SkeletonLine({ width = 'full', className }: { width?: string; className?: string }) {
  return <div className={cn('skeleton h-4 rounded', `w-${width}`, className)} />;
}

// ── EmptyState ────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  const { t } = useLanguage();
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        {icon ?? <Inbox className="w-8 h-8 text-gray-400" />}
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title ?? t('common.emptyState')}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}

// ── ErrorState ────────────────────────────────────────────────
interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title, description, onRetry, className }: ErrorStateProps) {
  const { t } = useLanguage();
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title ?? t('common.error')}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-4">{description}</p>
      )}
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary btn-sm flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

// ── DemoBanner ────────────────────────────────────────────────
export function DemoBanner() {
  const { t } = useLanguage();
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
      <span className="text-amber-500">⚠️</span>
      <span className="font-semibold text-amber-700 dark:text-amber-400">{t('common.demoMode')}:</span>
      <span className="text-amber-700 dark:text-amber-400">{t('common.demoModeDesc')}</span>
    </div>
  );
}
