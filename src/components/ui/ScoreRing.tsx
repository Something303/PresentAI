'use client';

import { cn } from '@/lib/utils';

interface ScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const sizeMap = {
  sm:  { ring: 56,  stroke: 5,  fontSize: 'text-sm',   labelSize: 'text-[10px]' },
  md:  { ring: 80,  stroke: 6,  fontSize: 'text-lg',   labelSize: 'text-xs' },
  lg:  { ring: 120, stroke: 8,  fontSize: 'text-2xl',  labelSize: 'text-xs' },
  xl:  { ring: 160, stroke: 10, fontSize: 'text-4xl',  labelSize: 'text-sm' },
};

function getColor(score: number) {
  if (score >= 80) return { stroke: '#22c55e', text: 'text-green-500' };
  if (score >= 60) return { stroke: '#eab308', text: 'text-yellow-500' };
  return { stroke: '#ef4444', text: 'text-red-500' };
}

export function ScoreRing({ score, size = 'md', showLabel, label, className }: ScoreRingProps) {
  const { ring, stroke, fontSize, labelSize } = sizeMap[size];
  const { stroke: strokeColor, text } = getColor(score);
  const radius = (ring - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={ring} height={ring} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background ring */}
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Score ring */}
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className={cn('font-bold leading-none', fontSize, text)}>{score}</span>
        {showLabel && label && (
          <span className={cn('text-gray-500 dark:text-gray-400 mt-0.5', labelSize)}>{label}</span>
        )}
      </div>
    </div>
  );
}

// ── ScoreBadge ──────────────────────────────────────────────
interface ScoreBadgeProps {
  score: number;
  className?: string;
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  const color =
    score >= 80
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      : score >= 60
      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';

  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold', color, className)}>
      {score}
    </span>
  );
}

// ── ProgressBar ──────────────────────────────────────────────
interface ProgressBarProps {
  value: number; // 0–100
  color?: string;
  className?: string;
  animated?: boolean;
}

export function ProgressBar({ value, color, className, animated = true }: ProgressBarProps) {
  const defaultColor =
    value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className={cn('progress-bar', className)}>
      <div
        className={cn('progress-fill', color ?? defaultColor, animated && 'transition-all duration-700')}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
