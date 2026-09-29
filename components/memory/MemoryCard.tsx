import React from 'react';
import { RecalledMemory } from '@/lib/types';
import { Brain, CheckCircle2, XCircle, Lightbulb, Clock } from 'lucide-react';
import { SeverityBadge } from '../incidents/SeverityBadge';

interface Props {
  recalled: RecalledMemory;
  compact?: boolean;
}

export function MemoryCard({ recalled, compact = false }: Props) {
  const { memory, relevance, relevanceLabel, scoreAvailable, source } = recalled;
  const scoreText = !scoreAvailable
    ? 'ranked match'
    : source === 'hindsight'
      ? relevance.toFixed(3)
      : `${Math.round(relevance * 100)}%`;

  return (
    <div className="rounded-2xl border border-[#1c2230] bg-[#11141c] p-5 transition-all hover:border-red-500/40 shadow-xl">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 flex-shrink-0">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white">
                {memory.incidentId}
              </span>
              <SeverityBadge severity={memory.severity} />
            </div>
            <h4 className="text-xs font-semibold text-slate-200 mt-0.5 leading-snug">
              {memory.title}
            </h4>
          </div>
        </div>

        {/* Relevance Badge */}
        <div className="flex flex-col items-end">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-medium">
            <span>{scoreText}</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {source === 'hindsight' ? relevanceLabel : 'Hindsight memory'}
          </span>
        </div>
      </div>

      {/* Symptoms */}
      <div className="mb-2 text-xs">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
          Previous Symptoms:
        </span>
        <ul className="mt-1 list-disc list-inside text-slate-300 space-y-0.5">
          {memory.symptoms.slice(0, compact ? 2 : 3).map((sym, i) => (
            <li key={i} className="truncate">{sym}</li>
          ))}
        </ul>
      </div>

      {/* Root Cause */}
      <div className="mb-2 text-xs rounded-xl bg-[#141824] p-3 border border-[#1c2230]">
        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
          Historical Root Cause:
        </span>
        <p className="text-slate-300 mt-0.5 line-clamp-2">{memory.rootCause}</p>
      </div>

      {/* Successful vs Failed Actions */}
      <div className="space-y-1.5 mb-2 text-xs">
        {memory.successfulActions.length > 0 && (
          <div className="flex items-start gap-1.5 text-emerald-300 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-400 flex-shrink-0" />
            <span className="line-clamp-2">
              <strong className="text-emerald-400 font-medium">Verified Fix:</strong> {memory.resolution || memory.successfulActions.join('; ')}
            </span>
          </div>
        )}

        {memory.failedActions && memory.failedActions.length > 0 && (
          <div className="flex items-start gap-1.5 text-rose-300 bg-rose-500/5 p-2 rounded-lg border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5 mt-0.5 text-rose-400 flex-shrink-0" />
            <span className="line-clamp-1">
              <strong className="text-rose-400 font-medium">Avoided (Failed):</strong> {memory.failedActions.join('; ')}
            </span>
          </div>
        )}
      </div>

      {/* Lessons Learned */}
      {memory.lessonsLearned && (
        <div className="rounded-xl bg-[#141824] border border-[#1c2230] p-2.5 text-xs text-slate-300">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-red-400 mb-0.5">
            <Lightbulb className="w-3 h-3 text-red-400" />
            <span>Lesson Learned:</span>
          </div>
          <p className="line-clamp-2 text-slate-300">{memory.lessonsLearned}</p>
        </div>
      )}

      {/* Footer Meta */}
      <div className="mt-3 pt-2.5 border-t border-[#1c2230] flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(memory.timestamp).toLocaleDateString()}
        </span>
        <span className="font-mono text-emerald-400">bank: RECALL</span>
      </div>
    </div>
  );
}
