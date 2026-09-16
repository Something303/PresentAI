'use client';

import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface AudioWaveformProps {
  volume: number; // 0 to 100
  isSpeaking: boolean;
  isMuted?: boolean;
}

export function AudioWaveform({ volume, isSpeaking, isMuted = false }: AudioWaveformProps) {
  // Generate 12 bars with responsive heights
  const bars = [0.3, 0.6, 0.9, 0.4, 0.8, 1.0, 0.7, 0.5, 0.85, 0.65, 0.45, 0.2];

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
      {isMuted ? (
        <MicOff className="w-4 h-4 text-red-400" />
      ) : (
        <Mic className={`w-4 h-4 transition-colors ${isSpeaking ? 'text-green-400 animate-pulse' : 'text-zinc-400'}`} />
      )}
      <div className="flex items-center gap-0.5 h-5 w-24">
        {bars.map((mult, i) => {
          const height = isMuted ? 4 : Math.max(4, Math.min(20, (volume * mult * 0.25) + 3));
          return (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-75 ${
                isMuted
                  ? 'bg-zinc-600'
                  : isSpeaking
                  ? 'bg-gradient-to-t from-green-500 to-emerald-400'
                  : 'bg-zinc-500/50'
              }`}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
      <span className="text-xs font-mono text-zinc-300 min-w-[28px] text-right">
        {isMuted ? 'Muted' : `${volume}%`}
      </span>
    </div>
  );
}
