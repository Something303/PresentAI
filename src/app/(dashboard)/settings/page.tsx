'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  User,
  Settings as SettingsIcon,
  Video,
  Mic,
  Globe,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Save,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useCamera } from '@/hooks/useCamera';
import { useMicrophone } from '@/hooks/useMicrophone';
import { AudioWaveform } from '@/components/presentation/AudioWaveform';
import type { ExaminerType, Difficulty, Language, Theme } from '@/types';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name || 'Alex Demo');
  const [email, setEmail] = useState(user?.email || 'demo@presentai.app');
  const [preferredExaminer, setPreferredExaminer] = useState<ExaminerType>(
    user?.preferred_examiner || 'general_audience'
  );
  const [defaultDifficulty, setDefaultDifficulty] = useState<Difficulty>(
    user?.default_difficulty || 'medium'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Hardware test hooks
  const camera = useCamera();
  const mic = useMicrophone();

  useEffect(() => {
    camera.startCamera();
    mic.startMicrophone();

    return () => {
      camera.stopCamera();
      mic.stopMicrophone();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    setSaveError(null);
    try {
      await updateProfile({
        name,
        preferred_examiner: preferredExaminer,
        default_difficulty: defaultDifficulty,
      });
      setSavedSuccess(true);
      toast.success(t('settings.saved'));
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      // Previously this error was swallowed inside updateProfile, so the UI always showed
      // "berhasil disimpan" even when the write to Supabase failed — now it reflects reality.
      const message = err instanceof Error
        ? err.message
        : t('settings.saveError');
      setSaveError(message);
      toast.error(`${t('settings.saveError')}: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-3 text-emerald-700 dark:text-emerald-400 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5" />
          {t('settings.saved')}
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-center gap-3 text-red-700 dark:text-red-400 text-xs font-semibold animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {t('settings.saveError')}: {saveError}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Profile Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 shadow-sm dark:shadow-md">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-200 dark:border-zinc-800">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('settings.profile')}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-2">{t('settings.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-2">{t('settings.email')}</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-zinc-950/60 border border-gray-200 dark:border-zinc-800/60 text-gray-400 dark:text-zinc-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* AI & Practice Preferences */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 shadow-sm dark:shadow-md">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-200 dark:border-zinc-800">
            <SettingsIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('settings.preferences')}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-2">
                {t('settings.preferredExaminer')}
              </label>
              <select
                value={preferredExaminer}
                onChange={(e) => setPreferredExaminer(e.target.value as ExaminerType)}
                className="w-full px-4 py-2.5 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="general_audience">{t('settings.examinerOptions.general_audience')}</option>
                <option value="lecturer">{t('settings.examinerOptions.lecturer')}</option>
                <option value="competition_judge">{t('settings.examinerOptions.competition_judge')}</option>
                <option value="hr_interviewer">{t('settings.examinerOptions.hr_interviewer')}</option>
                <option value="teacher">{t('settings.examinerOptions.teacher')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-2">
                {t('settings.defaultDifficulty')}
              </label>
              <select
                value={defaultDifficulty}
                onChange={(e) => setDefaultDifficulty(e.target.value as Difficulty)}
                className="w-full px-4 py-2.5 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="easy">{t('settings.difficultyOptions.easy')}</option>
                <option value="medium">{t('settings.difficultyOptions.medium')}</option>
                <option value="hard">{t('settings.difficultyOptions.hard')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Device & Hardware Test */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 shadow-sm dark:shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-gray-200 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Video className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('settings.camera')}</h2>
            </div>
            <span className="text-[11px] text-gray-500 dark:text-zinc-400">
              {t('settings.deviceNote')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Camera Test Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300">{t('settings.cameraPreview')}</label>
                <button
                  type="button"
                  onClick={() => camera.startCamera()}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                >
                  <RefreshCw className="w-3 h-3" /> {t('settings.retest')}
                </button>
              </div>

              {/* Camera Device Selector */}
              <div>
                <label className="block text-[11px] text-gray-500 dark:text-zinc-400 mb-1 font-medium">{t('settings.selectCamera')}</label>
                <select
                  value={camera.selectedDeviceId}
                  onChange={(e) => camera.switchDevice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {camera.devices.length === 0 && (
                    <option value="">{t('settings.defaultCamera')}</option>
                  )}
                  {camera.devices.map((device, idx) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `${t('settings.cameraFallback')} ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative w-full h-48 rounded-2xl bg-gray-100 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center">
                <video
                  ref={camera.videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${!camera.isReady ? 'hidden' : 'block'}`}
                />
                {!camera.isReady && (
                  <div className="text-center p-4">
                    <Video className="w-8 h-8 text-gray-400 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mb-2">
                      {camera.error || t('settings.cameraNotActive')}
                    </p>
                    <button
                      type="button"
                      onClick={() => camera.startCamera()}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium"
                    >
                      {t('settings.activateCamera')}
                    </button>
                  </div>
                )}
                {camera.isReady && (
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {t('settings.cameraConnected')}
                  </div>
                )}
              </div>
            </div>

            {/* Microphone Test */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300">{t('settings.microphone')}</label>
                <button
                  type="button"
                  onClick={() => mic.startMicrophone()}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                >
                  <RefreshCw className="w-3 h-3" /> {t('settings.retest')}
                </button>
              </div>

              {/* Microphone Device Selector */}
              <div>
                <label className="block text-[11px] text-gray-500 dark:text-zinc-400 mb-1 font-medium">{t('settings.selectMic')}</label>
                <select
                  value={mic.selectedDeviceId}
                  onChange={(e) => mic.switchDevice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {mic.devices.length === 0 && (
                    <option value="">{t('settings.defaultMic')}</option>
                  )}
                  {mic.devices.map((device, idx) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `${t('settings.micFallback')} ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 h-48 rounded-2xl bg-gray-100 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-3">
                <AudioWaveform volume={mic.volume} isSpeaking={mic.isSpeaking} />

                {/* Real-time Level Progress Bar */}
                <div className="w-full max-w-[240px] bg-gray-200 dark:bg-zinc-900 rounded-full h-2 overflow-hidden border border-gray-300 dark:border-zinc-800">
                  <div
                    className={`h-full transition-all duration-75 ${
                      mic.volume > 50 ? 'bg-amber-400' : mic.volume > 15 ? 'bg-emerald-400' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, mic.volume))}%` }}
                  />
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-700 dark:text-zinc-300 font-medium">
                    {mic.isSpeaking ? t('settings.voiceDetected') : t('settings.speakToTest')}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">
                    {t('settings.inputLevel')}: <span className="font-mono text-gray-700 dark:text-zinc-300 font-semibold">{mic.volume}%</span>
                  </p>
                </div>

                {(!mic.stream || mic.error) && (
                  <button
                    type="button"
                    onClick={() => mic.startMicrophone()}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium"
                  >
                    {t('settings.activateMic')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Language & Theme Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 shadow-sm dark:shadow-md">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-200 dark:border-zinc-800">
            <Globe className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('settings.languageThemeTitle')}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-2">{t('settings.language')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('id')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    language === 'id'
                      ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  🇮🇩 Bahasa Indonesia
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    language === 'en'
                      ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-2">{t('settings.theme')}</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    theme === 'dark'
                      ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" /> {t('settings.themes.dark')}
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    theme === 'light'
                      ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> {t('settings.themes.light')}
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    theme === 'system'
                      ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" /> {t('settings.themes.system')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:pointer-events-none text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-blue-500/25"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('settings.saving')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t('settings.save')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
