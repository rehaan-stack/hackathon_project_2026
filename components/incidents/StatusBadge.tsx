import React from 'react';
import { IncidentStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: IncidentStatus | 'Open' | 'Investigating' | 'Resolved' | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const norm = status.toLowerCase();

  let label = status;
  let style = 'bg-slate-800 text-slate-300 border-slate-700';

  if (norm === 'triggered' || norm === 'open') {
    label = 'Open';
    style = 'bg-[#3b1219] text-rose-300 border-[#6b1724]';
  } else if (norm === 'investigating') {
    label = 'Investigating';
    style = 'bg-[#2b1f47] text-purple-300 border-[#472d73]';
  } else if (norm === 'identified') {
    label = 'Identified';
    style = 'bg-[#14293d] text-cyan-300 border-[#1f4061]';
  } else if (norm === 'resolved') {
    label = 'Resolved';
    style = 'bg-[#0f382a] text-emerald-300 border-[#1a5c45]';
  } else if (norm === 'postmortem') {
    label = 'Postmortem';
    style = 'bg-[#281b3d] text-purple-300 border-[#3d295c]';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${style}`}
    >
      {label}
    </span>
  );
}
