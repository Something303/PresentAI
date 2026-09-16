'use client';

import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Layers, EyeOff } from 'lucide-react';
import { useMediaPipe } from '@/hooks/useMediaPipe';
import type { MediaPipeResult, Language } from '@/types';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  hasPermission: boolean | null;
  error: string | null;
  isReady: boolean;
  onRetry: () => void;
  onMetricsUpdate?: (metrics: MediaPipeResult) => void;
  compact?: boolean;
  micVolume?: number;
  micSpeaking?: boolean;
  hasMicPermission?: boolean | null;
  micError?: string | null;
  language?: Language;
}

export function CameraPreview({
  videoRef,
  hasPermission,
  error,
  isReady,
  onRetry,
  onMetricsUpdate,
  compact = false,
  language = 'id',
}: CameraPreviewProps) {
  const isIndo = language === 'id';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Default Hide HUD (HUD overlay is hidden by default)
  const [showOverlay, setShowOverlay] = useState(false);

  const { metrics, isFaceDetected, postureFeedback } = useMediaPipe({
    videoRef,
    canvasRef,
    enabled: isReady,
    language,
  });

  // Notify parent of real-time metrics
  React.useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }
  }, [metrics, onMetricsUpdate]);

  return (
    <div className="w-full">
      {/* Fixed-height Top Bar above video (prevents layout shifts & jumping) */}
      <div className="h-[62px] mb-2.5 flex flex-col justify-between px-0.5 pr-2 select-none">
        {/* Row 1: Camera Status & Tools */}
        <div className="flex items-center justify-between gap-2 h-7">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-white shadow-sm flex-shrink-0">
            <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isIndo ? 'Kamera Live' : 'Live Camera'}
          </span>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-400 shadow-sm">
              <span className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              {isIndo ? 'AI MediaPipe Aktif' : 'MediaPipe AI Active'}
            </span>
            <button
              type="button"
              onClick={() => setShowOverlay(!showOverlay)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all shadow-sm flex-shrink-0 ${
                showOverlay
                  ? 'bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title={isIndo
                ? (showOverlay ? 'Sembunyikan panduan HUD visual' : 'Tampilkan panduan HUD visual')
                : (showOverlay ? 'Hide the visual HUD guide' : 'Show the visual HUD guide')}
            >
              {showOverlay ? <EyeOff className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
              <span>HUD</span>
            </button>
          </div>
        </div>

        {/* Row 2: Fixed-height Alignment / Posture Status Strip (never wraps) */}
        <div className="flex items-center h-6 overflow-hidden">
          {isReady && isFaceDetected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-[11px] font-medium text-blue-400 shadow-sm max-w-full truncate transition-all duration-150">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span className="truncate">{postureFeedback}</span>
            </span>
          ) : isReady ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-[11px] font-medium text-zinc-500 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              {isIndo ? 'Mendeteksi posisi wajah & postur...' : 'Detecting face & posture position...'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Video Container */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex items-center justify-center ${
          compact ? 'w-full h-48' : 'w-full aspect-[4/3] max-h-[340px]'
        }`}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${!isReady ? 'hidden' : 'block'}`}
        />

        {/* MediaPipe / CV Canvas Overlay (toggleable via showOverlay, default hidden) */}
        {isReady && (
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-none object-cover transform -scale-x-100 transition-opacity duration-200 ${
              showOverlay ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Permission Denied or Error State */}
        {hasPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/90 z-20 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">
              {isIndo ? 'Akses Kamera Diperlukan' : 'Camera Access Required'}
            </h4>
            <p className="text-xs text-zinc-400 mb-4 max-w-xs">
              {error || (isIndo
                ? 'Mohon izinkan akses kamera di peramban Anda untuk mengaktifkan analisis ekspresi dan postur.'
                : 'Please allow camera access in your browser to enable expression and posture analysis.')}
            </p>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isIndo ? 'Coba Hubungkan Ulang' : 'Try Reconnecting'}
            </button>
          </div>
        )}

        {/* Loading Camera State */}
        {hasPermission === null && !isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-900 z-10">
            <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin mb-3" />
            <p className="text-xs text-zinc-400">
              {isIndo ? 'Menghubungkan kamera & sensor AI...' : 'Connecting camera & AI sensors...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
