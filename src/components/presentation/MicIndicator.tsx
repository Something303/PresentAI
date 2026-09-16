'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Pause } from 'lucide-react';
import type { Language } from '@/types';

interface MicIndicatorProps {
  volume: number; // 0 - 100
  isSpeaking: boolean;
  hasPermission?: boolean | null;
  error?: string | null;
  isPaused?: boolean;
  isRecording?: boolean;
  deviceName?: string;
  onRetry?: () => void;
  variant?: 'header' | 'hud' | 'ticker' | 'pill';
  showLabel?: boolean;
  language?: Language;
}

export function MicIndicator({
  volume,
  isSpeaking,
  hasPermission = true,
  error = null,
  isPaused = false,
  isRecording = false,
  deviceName,
  onRetry,
  variant = 'header',
  showLabel = true,
  language = 'id',
}: MicIndicatorProps) {
  const isIndo = language === 'id';
  const [showTooltip, setShowTooltip] = useState(false);

  // Calibrated, smooth bar heights (capped, gentle range: 3px - 13px)
  const barHeights = isSpeaking
    ? [
        Math.min(11, Math.max(3, Math.round(volume * 0.10 + 3))),
        Math.min(13, Math.max(4, Math.round(volume * 0.15 + 3))),
        Math.min(12, Math.max(4, Math.round(volume * 0.13 + 3))),
        Math.min(9, Math.max(3, Math.round(volume * 0.08 + 3))),
      ]
    : [3, 3, 3, 3];

  // 1. Error / Permission Denied State
  if (hasPermission === false || error) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium ${
          variant === 'hud' ? 'bg-black/70 backdrop-blur-md text-[11px] py-1 px-2.5' : ''
        }`}
        title={error || (isIndo ? 'Akses mikrofon tidak diizinkan. Klik untuk mencoba lagi.' : 'Microphone access denied. Click to try again.')}
      >
        <MicOff className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
        {showLabel && <span>{isIndo ? 'Mic Mati' : 'Mic Off'}</span>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-[10px] underline ml-0.5 hover:text-white"
          >
            {isIndo ? 'Hubungkan' : 'Connect'}
          </button>
        )}
      </div>
    );
  }

  // 2. Paused State
  if (isPaused) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium ${
          variant === 'hud' ? 'bg-black/70 backdrop-blur-md text-[11px] py-1 px-2.5' : ''
        }`}
      >
        <Pause className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        {showLabel && <span>{isIndo ? 'Mic Dijeda' : 'Mic Paused'}</span>}
      </div>
    );
  }

  // 3. HUD Variant (For Camera Preview Overlay)
  if (variant === 'hud') {
    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-medium transition-colors duration-200 pointer-events-auto select-none ${
          isSpeaking
            ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
            : 'bg-black/60 border-white/10 text-zinc-300'
        }`}
        title={`${isIndo ? 'Status Mic' : 'Mic Status'}: ${isSpeaking ? (isIndo ? 'Suara Masuk' : 'Voice Detected') : 'Standby'}${deviceName ? ` • ${deviceName}` : ''}`}
      >
        <Mic className={`w-3 h-3 transition-colors duration-150 ${isSpeaking ? 'text-emerald-400' : 'text-zinc-400'}`} />
        <div className="flex items-center gap-0.5 h-2.5">
          {barHeights.slice(0, 3).map((h, i) => (
            <span
              key={i}
              className={`w-0.5 rounded-full transition-all duration-150 ease-out ${
                isSpeaking ? 'bg-emerald-400' : 'bg-zinc-500'
              }`}
              style={{ height: `${Math.min(9, h)}px` }}
            />
          ))}
        </div>
        <span className="font-mono text-[10px] text-zinc-300">
          Mic
        </span>
      </div>
    );
  }

  // 4. Ticker Variant (For Live Speech Transcript Card)
  if (variant === 'ticker') {
    return (
      <div
        className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-colors duration-200 select-none ${
          isSpeaking
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400'
        }`}
      >
        <Mic className={`w-3.5 h-3.5 transition-colors duration-150 ${isSpeaking ? 'text-emerald-400' : 'text-zinc-400'}`} />
        <div className="flex items-center gap-0.5 h-3">
          {barHeights.map((h, i) => (
            <span
              key={i}
              className={`w-0.5 rounded-full transition-all duration-150 ease-out ${
                isSpeaking ? 'bg-emerald-400' : 'bg-zinc-600'
              }`}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
        <span className="text-[11px] font-medium transition-colors duration-150">
          {isSpeaking ? (isIndo ? 'Suara Masuk' : 'Voice Detected') : (isIndo ? 'Mic Siap' : 'Mic Ready')}
        </span>
      </div>
    );
  }

  // 5. Header Variant (Main Top Bar - Fixed Width & Stable)
  return (
    <div
      className="relative select-none"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border font-sans text-xs transition-colors duration-200 cursor-default ${
          isSpeaking
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-zinc-900 border-zinc-800 text-zinc-300'
        }`}
      >
        {/* Steady Mic Icon */}
        <Mic className={`w-4 h-4 flex-shrink-0 transition-colors duration-150 ${isSpeaking ? 'text-emerald-400' : 'text-zinc-400'}`} />

        {/* Dynamic Multi-Bar Waveform - Calm & Damped */}
        <div className="flex items-center gap-1 h-3.5 w-5 justify-center flex-shrink-0">
          {barHeights.map((h, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ease-out ${
                isSpeaking
                  ? 'bg-emerald-400'
                  : 'bg-zinc-700'
              }`}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>

        {/* Stable Status Label (Fixed content so width NEVER jumps) */}
        {showLabel && (
          <span
            className={`font-semibold transition-colors duration-150 ${
              isSpeaking ? 'text-emerald-300' : 'text-zinc-300'
            }`}
          >
            {isIndo ? 'Mic Aktif' : 'Mic Active'}
          </span>
        )}
      </div>

      {/* Info Tooltip on Hover - Fixed Width (w-72) & Static Alignment (No Vibrate/Shift) */}
      {showTooltip && (
        <div className="absolute top-full mt-2 left-0 sm:left-1/2 sm:-translate-x-1/2 w-72 z-50 p-3 rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-2xl backdrop-blur-md pointer-events-none">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 font-semibold text-white text-xs">
              <span className={`w-2 h-2 rounded-full transition-colors duration-150 ${isSpeaking ? 'bg-emerald-400' : 'bg-blue-400'}`} />
              <span>{isIndo ? 'Mikrofon Terhubung' : 'Microphone Connected'}</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-400">
              {isSpeaking ? (isIndo ? 'Suara Masuk' : 'Voice Detected') : 'Standby'}
            </span>
          </div>

          <p className="text-zinc-400 text-[11px] truncate mb-2">
            {deviceName || (isIndo ? 'Mikrofon Sistem' : 'System Microphone')}
          </p>

          {/* Smooth Volume Level Bar */}
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-150 ease-out ${
                volume > 50 ? 'bg-amber-400' : volume > 10 ? 'bg-emerald-400' : 'bg-zinc-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(3, volume))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
