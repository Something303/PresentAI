'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector, ThemeToggle } from '@/components/ui/LanguageThemeToggle';
import { Presentation, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export default function RegisterPage() {
  const { t } = useLanguage();
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const { register, handleSubmit, watch } = useForm<FormData>();
  const password = watch('password', '');

  const validate = (data: FormData): boolean => {
    const errs: Partial<FormData> = {};
    if (!data.name.trim()) errs.name = t('auth.errors.nameRequired');
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      errs.email = t('auth.errors.emailInvalid');
    if (!data.password || data.password.length < 8)
      errs.password = t('auth.errors.passwordMin');
    if (data.password !== data.confirm_password)
      errs.confirm_password = t('auth.errors.passwordMismatch');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (data: FormData) => {
    if (!validate(data)) return;
    setIsLoading(true);
    const result = await registerUser(data.name, data.email, data.password);
    setIsLoading(false);
    if (result.error) {
      toast.error(result.error || t('auth.errors.registerFailed'));
    } else {
      toast.success(t('auth.accountCreated'));
      router.push('/dashboard');
    }
  };

  const passwordStrength = (): { label: string; color: string; width: string } => {
    if (!password) return { label: '', color: 'bg-gray-200', width: '0%' };
    if (password.length < 6) return { label: t('auth.passwordStrength.weak'), color: 'bg-red-400', width: '25%' };
    if (password.length < 8) return { label: t('auth.passwordStrength.fair'), color: 'bg-yellow-400', width: '50%' };
    if (password.match(/[A-Z]/) && password.match(/[0-9]/))
      return { label: t('auth.passwordStrength.strong'), color: 'bg-green-500', width: '100%' };
    return { label: t('auth.passwordStrength.medium'), color: 'bg-blue-400', width: '75%' };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Left: Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand-600 to-purple-700 items-center justify-center p-12">
        <div className="text-white max-w-sm">
          <h2 className="text-3xl font-bold mb-4">{t('auth.registerHero.title')}</h2>
          <p className="text-brand-200 leading-relaxed mb-8">
            {t('auth.registerHero.subtitle')}
          </p>
          <div className="space-y-4">
            {[
              t('auth.registerHero.benefit1'),
              t('auth.registerHero.benefit2'),
              t('auth.registerHero.benefit3'),
              t('auth.registerHero.benefit4'),
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-brand-100 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-12 py-12">
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

        <div className="max-w-sm mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {t('auth.register')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('auth.haveAccount')}{' '}
              <Link href="/login" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
                {t('auth.loginButton')}
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="label">{t('auth.name')}</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className={cn('input', errors.name && 'border-red-400')}
                placeholder="Alex Johnson"
                {...register('name')}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">{t('auth.email')}</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={cn('input', errors.email && 'border-red-400')}
                placeholder="email@example.com"
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">{t('auth.password')}</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={cn('input pr-10', errors.password && 'border-red-400')}
                  placeholder={t('auth.passwordPlaceholder')}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{t('auth.passwordStrength.label')}</span>
                    <span className={cn(
                      strength.color.replace('bg-', 'text-'),
                      'font-medium'
                    )}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div className={cn('h-full rounded-full transition-all', strength.color)} style={{ width: strength.width }} />
                  </div>
                </div>
              )}
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm_password" className="label">{t('auth.confirmPassword')}</label>
              <input
                id="confirm_password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={cn('input', errors.confirm_password && 'border-red-400')}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                {...register('confirm_password')}
              />
              {errors.confirm_password && (
                <p className="mt-1 text-xs text-red-500">{errors.confirm_password}</p>
              )}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3">
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}</>
              ) : (
                t('auth.registerButton')
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
