'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Language } from '@/types';
import idTranslations from '@/locales/id.json';
import enTranslations from '@/locales/en.json';

type Translations = typeof idTranslations;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translations: Translations;
}

const translationMap: Record<Language, Translations> = {
  id: idTranslations,
  en: enTranslations,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // fallback to key if not found
    }
  }
  return typeof current === 'string' ? current : path;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('id');

  useEffect(() => {
    const saved = localStorage.getItem('presentai-language') as Language | null;
    if (saved && (saved === 'id' || saved === 'en')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('presentai-language', lang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(
        translationMap[language] as unknown as Record<string, unknown>,
        key
      );
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translations: translationMap[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
