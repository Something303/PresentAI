'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector, ThemeToggle } from '@/components/ui/LanguageThemeToggle';
import { Presentation, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function LandingNavbar() {
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#features', label: t('nav.features') },
    { href: '#how-it-works', label: t('nav.howItWorks') },
    { href: '#scoring', label: 'Scoring' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl shadow-soft border-b border-gray-100 dark:border-gray-800'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-brand">
              <Presentation className="w-5 h-5 text-white" />
            </div>
            <span
              className={cn(
                'text-lg font-bold transition-colors',
                isScrolled ? 'text-gray-900 dark:text-gray-100' : 'text-white'
              )}
            >
              PresentAI
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  isScrolled
                    ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-2">
            <LanguageSelector className={isScrolled ? '' : 'text-white/80 hover:text-white'} />
            <ThemeToggle />
            <Link
              href="/login"
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                isScrolled
                  ? 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              )}
            >
              {t('nav.login')}
            </Link>
            <Link href="/register" className="btn-primary btn-sm">
              {t('nav.startPracticing')}
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className={cn('md:hidden p-2 rounded-lg', isScrolled ? 'text-gray-700 dark:text-gray-200' : 'text-white')}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 rounded-2xl shadow-soft-lg border border-gray-100 dark:border-gray-800 mb-4 p-4 space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {link.label}
              </a>
            ))}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-2 space-y-2">
              <LanguageSelector />
              <Link href="/login" className="btn-secondary w-full justify-center">
                {t('nav.login')}
              </Link>
              <Link href="/register" className="btn-primary w-full justify-center">
                {t('nav.startPracticing')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
