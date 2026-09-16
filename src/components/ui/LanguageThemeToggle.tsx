'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Globe, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language, Theme } from '@/types';

// ── LanguageSelector ─────────────────────────────────────────
interface LanguageSelectorProps {
  className?: string;
  compact?: boolean;
}

export function LanguageSelector({ className, compact }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  const toggle = () => setLanguage(language === 'id' ? 'en' : 'id');

  if (compact) {
    return (
      <button
        onClick={toggle}
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400',
          'hover:text-brand-600 dark:hover:text-brand-400 transition-colors px-2 py-1 rounded-lg',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          className
        )}
        aria-label="Toggle language"
      >
        <Globe className="w-3.5 h-3.5" />
        {language === 'id' ? 'ID' : 'EN'}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400',
        'hover:text-brand-600 dark:hover:text-brand-400 transition-colors',
        'px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800',
        className
      )}
      aria-label="Toggle language"
    >
      <Globe className="w-4 h-4" />
      <span>{language === 'id' ? '🇮🇩 Bahasa Indonesia' : '🇬🇧 English'}</span>
    </button>
  );
}

// ── ThemeSelector ─────────────────────────────────────────────
interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light',  icon: <Sun className="w-4 h-4" />,     label: 'Light' },
    { value: 'dark',   icon: <Moon className="w-4 h-4" />,    label: 'Dark' },
    { value: 'system', icon: <Monitor className="w-4 h-4" />, label: 'System' },
  ];

  return (
    <div className={cn('flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl', className)}>
      {options.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            theme === value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          )}
          aria-pressed={theme === value}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ── ThemeToggle (single button) ───────────────────────────────
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all',
        className
      )}
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
