import React from 'react';
import { Severity } from '@/lib/types';

interface SeverityBadgeProps {
  severity: Severity | 'Critical' | 'High' | 'Medium' | 'Low' | string;
  showDot?: boolean;
}

export function SeverityBadge({ severity, showDot = false }: SeverityBadgeProps) {
  const norm = severity.toUpperCase();

  let label = severity;
  let style = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  let dotColor = 'bg-amber-400';

  if (norm === 'SEV-1' || norm === 'CRITICAL') {
    label = 'Critical';
    style = 'bg-red-500/20 text-red-400 border-red-500/40 shadow-xs shadow-red-500/20';
    dotColor = 'bg-red-400 animate-pulse';
  } else if (norm === 'SEV-2' || norm === 'HIGH') {
    label = 'High';
    style = 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    dotColor = 'bg-orange-400';
  } else if (norm === 'SEV-3' || norm === 'MEDIUM') {
    label = 'Medium';
    style = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    dotColor = 'bg-amber-400';
  } else if (norm === 'SEV-4' || norm === 'LOW') {
    label = 'Low';
    style = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    dotColor = 'bg-emerald-400';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${style}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      {label}
    </span>
  );
}
