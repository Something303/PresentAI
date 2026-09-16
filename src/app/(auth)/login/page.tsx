'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector, ThemeToggle } from '@/components/ui/LanguageThemeToggle';
import { Presentation, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { t, language } = useLanguage();
  const { login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    const result = await login(data.email, data.password, data.remember ?? true);
    setIsLoading(false);
    if (result.error) {
      toast.error(result.error || t('auth.errors.loginFailed'));
    } else {
      toast.success(t('auth.login') + '!');
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Left: Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-12 py-12">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12 max-w-sm mx-auto w-full">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Presentation className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-100">PresentAI</span>
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSelector compact />
            <ThemeToggle />
          </div>
        </div>

        {/* Form */}
        <div className="max-w-sm mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {t('auth.login')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('auth.noAccount')}{' '}
              <Link href="/register" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
                {t('auth.registerButton')}
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">{t('auth.email')}</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={cn('input', errors.email && 'border-red-400 focus:ring-red-400')}
                placeholder="email@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{t('auth.errors.emailInvalid')}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="label mb-0">{t('auth.password')}</label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={cn('input pr-10', errors.password && 'border-red-400 focus:ring-red-400')}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{t('auth.errors.passwordRequired')}</p>
              )}
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                {...register('remember')}
              />
              <label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.rememberMe')}
              </label>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3">
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}</>
              ) : (
                t('auth.loginButton')
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right: Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand-600 to-purple-700 items-center justify-center p-12">
        <div className="text-center text-white max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Presentation className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Practice. Present. Improve.</h2>
          <p className="text-brand-200 leading-relaxed">
            {language === 'id'
              ? 'Latih kemampuan presentasimu dengan feedback AI yang personal dan terukur.'
              : 'Practice your presentation skills with personal, measurable AI feedback.'}
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {/* Verifiable product facts (not usage claims — see landing page for the same fix) */}
            {[
              { value: '6', label: language === 'id' ? 'Dimensi Penilaian' : 'Scoring Dimensions' },
              { value: '5', label: language === 'id' ? 'Persona Penguji' : 'Examiner Personas' },
              { value: '3', label: language === 'id' ? 'Tingkat Kesulitan' : 'Difficulty Levels' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-2xl p-3">
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-brand-200">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
