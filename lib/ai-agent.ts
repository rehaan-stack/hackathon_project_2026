import 'server-only';

import type {
  Incident,
  InvestigationResult,
  InvestigationStep,
  RecalledMemory,
} from './types';
import { getMemoryProvider } from './memory-provider';

const INCIDENT_ANALYSIS_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'historicalContext',
    'likelyRootCause',
    'evidence',
    'recommendedActions',
    'whyTheseActions',
    'confidence',
    'uncertainties',
    'previousExperienceIds',
  ],
  properties: {
    summary: { type: 'string' },
    historicalContext: { type: 'string' },
    likelyRootCause: { type: 'string' },
    evidence: { type: 'array', items: { type: 'string' } },
    recommendedActions: { type: 'array', items: { type: 'string' } },
    whyTheseActions: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    uncertainties: { type: 'array', items: { type: 'string' } },
    previousExperienceIds: { type: 'array', items: { type: 'string' } },
  },
};

interface StructuredAnalysis {
  summary: string;
  historicalContext: string;
  likelyRootCause: string;
  evidence: string[];
  recommendedActions: string[];
  whyTheseActions: string;
  confidence: number;
  uncertainties: string[];
  previousExperienceIds: string[];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function parseStructuredAnalysis(value: Record<string, unknown> | undefined): StructuredAnalysis | undefined {
  if (!value) return undefined;
  const summary = stringValue(value.summary);
  const historicalContext = stringValue(value.historicalContext);
  const likelyRootCause = stringValue(value.likelyRootCause);
  const whyTheseActions = stringValue(value.whyTheseActions);
  const confidence = typeof value.confidence === 'number' && value.confidence >= 0 && value.confidence <= 1
    ? value.confidence
    : undefined;
  const evidence = strings(value.evidence);
  const recommendedActions = strings(value.recommendedActions);
  const uncertainties = strings(value.uncertainties);
  const previousExperienceIds = strings(value.previousExperienceIds);

  if (!summary || !historicalContext || !likelyRootCause || !whyTheseActions || confidence === undefined || evidence.length === 0 || recommendedActions.length === 0) {
    return undefined;
  }

  return {
    summary,
    historicalContext,
    likelyRootCause,
    evidence,
    recommendedActions,
    whyTheseActions,
    confidence,
    uncertainties,
    previousExperienceIds,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function buildRecallQuery(incident: Incident): string {
  return [
    `Find resolved production incidents relevant to ${incident.id}: ${incident.title}.`,
    `Affected service: ${incident.service}. Severity: ${incident.severity}.`,
    `Symptoms: ${incident.symptoms.join('; ')}.`,
    incident.errorInfo ? `Reported error: ${incident.errorInfo}.` : '',
    incident.logs.length > 0 ? `Representative logs: ${incident.logs.slice(0, 8).join(' | ')}.` : '',
    `Tags: ${incident.tags.join(', ')}.`,
    'Prioritize confirmed root causes, actions that succeeded, actions that failed, and lessons learned.',
  ].filter(Boolean).join('\n');
}

function historyPrompt(memories: RecalledMemory[]): string {
  if (memories.length === 0) return 'No historical experience was retrieved by the application recall step.';
  return memories.map((recalled) => [
    `Historical incident ID: ${recalled.memory.incidentId}`,
    `Memory ID: ${recalled.memory.id}`,
    `Title: ${recalled.memory.title}`,
    `Root cause: ${recalled.memory.rootCause || recalled.factText || 'Not available'}`,
    `Successful actions: ${recalled.memory.successfulActions.join('; ') || 'Not available'}`,
    `Failed actions: ${recalled.memory.failedActions.join('; ') || 'None recorded'}`,
    `Resolution: ${recalled.memory.resolution || 'Not available'}`,
    `Lessons: ${recalled.memory.lessonsLearned || 'Not available'}`,
  ].join('\n')).join('\n\n');
}

function reflectionPrompt(incident: Incident, memories: RecalledMemory[]): string {
  return [
    'You are RECALL, an incident-response agent. Produce a conservative, operationally safe investigation for the current incident.',
    'Treat the current telemetry as evidence, not proof. Do not invent commands, successful outcomes, or historical incidents.',
    'Only cite previousExperienceIds from the historical incident IDs and memory IDs explicitly provided below. An empty array is required when none influence the recommendation.',
    'Use historical actions only when they fit the present evidence. Call out uncertainty where confirmation is needed before an irreversible action.',
    '',
    'CURRENT INCIDENT',
    buildRecallQuery(incident),
    '',
    'APPLICATION RECALL RESULTS',
    historyPrompt(memories),
  ].join('\n');
}

function findHistoricalInfluence(memories: RecalledMemory[], references: string[]): RecalledMemory[] {
  const wanted = new Set(references.map((value) => value.toLowerCase()));
  return memories.filter((memory) => [memory.memory.id, memory.memory.incidentId, memory.factId]
    .filter((value): value is string => Boolean(value))
    .some((value) => wanted.has(value.toLowerCase())));
}

function baselineAnalysis(incident: Incident, memories: RecalledMemory[]) {
  const corpus = `${incident.symptoms.join(' ')} ${incident.logs.join(' ')} ${incident.errorInfo || ''}`.toLowerCase();
  const evidence: string[] = [];
  const recommendedActions: string[] = [];
  const uncertainties: string[] = [];
  let likelyRootCause = incident.errorInfo || 'A dependency or service-level degradation requires confirmation.';

  const memory = memories.find((candidate) =>
    candidate.memory.rootCause || candidate.memory.successfulActions.length > 0 || candidate.factText
  );
  if (memory) {
    likelyRootCause = `Possible recurrence of ${memory.memory.incidentId}: ${memory.memory.rootCause || memory.factText || 'related historical failure pattern'}`;
    recommendedActions.push(...memory.memory.successfulActions);
    if (memory.memory.failedActions.length > 0) {
      uncertainties.push(`Avoid repeating previously unsuccessful actions: ${memory.memory.failedActions.join('; ')}.`);
    }
  }

  if (/connection|pool|pgpool|postgres/.test(corpus)) {
    evidence.push('Telemetry and logs indicate connection acquisition pressure or pool saturation.');
    recommendedActions.push(
      'Identify blocking and long-running database queries before changing capacity.',
      'Apply a bounded connection-acquisition timeout and statement timeout.',
      'Validate pool utilization and request latency after each mitigation.'
    );
    uncertainties.push('Confirm whether the saturation is caused by lock contention, a traffic increase, or a leaking connection before scaling the pool.');
  } else if (/heap|memory|gc|leak|evict/.test(corpus)) {
    evidence.push('Heap growth and garbage-collection pressure indicate a likely memory-retention issue.');
    recommendedActions.push(
      'Capture a heap profile from one affected instance before recycling it.',
      'Limit cache cardinality and roll out a bounded-cache mitigation.',
      'Use a controlled rolling restart only after preserving diagnostic evidence.'
    );
    uncertainties.push('Confirm the retaining object path with a heap profile before declaring the root cause.');
  } else if (/jwt|jwks|token|401|auth/.test(corpus)) {
    evidence.push('Authentication telemetry contains token or key-validation failures.');
    recommendedActions.push(
      'Compare active signing key IDs with the JWKS response.',
      'Invalidate stale JWKS caches after validating the rotation state.',
      'Add rotation-to-cache-invalidation verification before closing the incident.'
    );
  } else if (/cache|redis|hit ratio/.test(corpus)) {
    evidence.push('Cache-related symptoms point to a miss storm, eviction issue, or primary-node instability.');
    recommendedActions.push(
      'Inspect cache hit rate, eviction policy, and replica lag.',
      'Enable request coalescing or stale serving to protect origin capacity.',
      'Verify primary and replica health before promoting any node.'
    );
  } else if (/payment|stripe|gateway/.test(corpus)) {
    evidence.push('Payment processing telemetry suggests an upstream dependency degradation.');
    recommendedActions.push(
      'Verify the payment-provider status and current circuit-breaker state.',
      'Queue retry-safe payments rather than issuing duplicate charges.',
      'Route only idempotent, validated traffic to an approved secondary provider.'
    );
  } else {
    evidence.push('The reported symptoms need correlation with recent deployments and dependent-service health.');
    recommendedActions.push(
      'Compare the start time with recent deploys and configuration changes.',
      'Inspect dependency error budgets and trace samples.',
      'Use a reversible mitigation while collecting evidence for the postmortem.'
    );
  }

  return {
    summary: `${incident.severity} incident affecting ${incident.service}: ${incident.title}. ${incident.symptoms.slice(0, 2).join('. ')}`,
    historicalContext: memory
      ? `The application recalled ${memory.memory.incidentId} from ${memory.source === 'hindsight' ? 'live Hindsight' : 'the development fallback'} and used its recorded outcome to prioritize investigation.`
      : 'No historical experience was used for this recommendation; the plan is based on current telemetry and conservative first-principles diagnostics.',
    likelyRootCause,
    evidence: unique(evidence),
    recommendedActions: unique(recommendedActions),
    whyTheseActions: memory
      ? `The plan incorporates confirmed successful actions from ${memory.memory.incidentId} while retaining current-incident verification steps.`
      : 'The plan stops immediate impact first, preserves evidence, and keeps mitigation reversible until the root cause is confirmed.',
    confidence: memory ? 0.7 : 0.55,
    uncertainties: unique(uncertainties),
    usedMemories: memory ? [memory] : [],
  };
}

export async function investigateIncident(incident: Incident, workspaceTag?: string): Promise<InvestigationResult> {
  const provider = getMemoryProvider();
  const memoryQuery = buildRecallQuery(incident);
  const demoScope = incident.tags.filter((tag) => tag.startsWith('demo:'));
  const scopeTags = [workspaceTag, ...demoScope].filter((tag): tag is string => Boolean(tag));
  const recall = await provider.recall(memoryQuery, {
    tags: scopeTags.length > 0 ? scopeTags : undefined,
    strictTags: scopeTags.length > 0,
  });

  const baseline = baselineAnalysis(incident, recall.memories);
  const warnings: string[] = [];
  if (recall.status === 'fallback' || recall.status === 'unavailable') warnings.push(recall.message);

  let analysis = baseline;
  let agentMode: InvestigationResult['agentMode'] = 'deterministic-fallback';
  let usedMemories = baseline.usedMemories;

  if (recall.mode === 'hindsight') {
    const reflection = await provider.reflect({
      query: reflectionPrompt(incident, recall.memories),
        tags: scopeTags.length > 0 ? scopeTags : undefined,
        strictTags: scopeTags.length > 0,
      responseSchema: INCIDENT_ANALYSIS_SCHEMA,
    });
    const structured = reflection.success ? parseStructuredAnalysis(reflection.structuredOutput) : undefined;
    if (structured) {
      const citedMemories = findHistoricalInfluence(recall.memories, structured.previousExperienceIds);
      analysis = {
        ...structured,
        usedMemories: citedMemories,
      };
      usedMemories = citedMemories;
      agentMode = 'hindsight-reflect';
    } else if (reflection.message) {
      warnings.push(reflection.message);
    }
  }

  const now = new Date();
  const recallDetail = recall.status === 'unavailable'
    ? recall.message
    : `${recall.memories.length} historical ${recall.memories.length === 1 ? 'experience' : 'experiences'} returned. ${recall.message}`;
  const steps: InvestigationStep[] = [
    {
      id: 'telemetry',
      label: 'Analyzing telemetry and symptoms',
      status: 'complete',
      detail: `Parsed ${incident.symptoms.length} symptoms and ${incident.logs.length} log lines for ${incident.service}.`,
      startedAt: new Date(now.getTime() - 4_000).toISOString(),
      completedAt: new Date(now.getTime() - 3_000).toISOString(),
    },
    {
      id: 'recall',
      label: recall.mode === 'hindsight' ? 'Querying live Hindsight memory' : 'Querying development fallback memory',
      status: recall.status === 'unavailable' ? 'error' : 'complete',
      detail: recallDetail,
      startedAt: new Date(now.getTime() - 3_000).toISOString(),
      completedAt: new Date(now.getTime() - 2_000).toISOString(),
    },
    {
      id: 'comparison',
      label: 'Comparing historical experience',
      status: 'complete',
      detail: usedMemories.length > 0
        ? `Recommendation influenced by ${usedMemories.map((memory) => memory.memory.incidentId).join(', ')}.`
        : 'No retrieved experience was used in the recommendation.',
      startedAt: new Date(now.getTime() - 2_000).toISOString(),
      completedAt: new Date(now.getTime() - 1_000).toISOString(),
    },
    {
      id: 'recommendation',
      label: agentMode === 'hindsight-reflect' ? 'Generating Hindsight reflect analysis' : 'Generating deterministic diagnostic fallback',
      status: 'complete',
      detail: agentMode === 'hindsight-reflect'
        ? 'Live Hindsight reflect returned structured incident analysis.'
        : 'Structured live reflect was unavailable; the response is explicitly heuristic.',
      startedAt: new Date(now.getTime() - 1_000).toISOString(),
      completedAt: now.toISOString(),
    },
  ];

  return {
    incidentId: incident.id,
    summary: analysis.summary,
    historicalContext: analysis.historicalContext,
    likelyRootCause: analysis.likelyRootCause,
    evidence: analysis.evidence,
    recommendedActions: analysis.recommendedActions,
    whyTheseActions: analysis.whyTheseActions,
    confidence: analysis.confidence,
    uncertainties: analysis.uncertainties,
    previousExperienceUsed: usedMemories,
    memoryRecall: {
      mode: recall.mode,
      status: recall.status,
      message: recall.message,
      retrievedCount: recall.memories.length,
      usedMemoryIds: usedMemories.map((memory) => memory.memory.id),
    },
    agentMode,
    agentWarnings: warnings,
    steps,
    timestamp: now.toISOString(),
  };
}
