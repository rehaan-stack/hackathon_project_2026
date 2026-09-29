import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  HindsightClient,
  HindsightError,
  type RecallResult,
} from '@vectorize-io/hindsight-client';
import type {
  Incident,
  MemoryEntry,
  MemoryMode,
  RecalledMemory,
  ResolutionForm,
  RetentionResult,
} from './types';
import { demoMemories } from './demo-data';

const MEMORY_SCHEMA_VERSION = 'recall.incident-experience.v1';
const FALLBACK_MEMORY_FILE = join(process.cwd(), '.recall-data', 'demo-memory.json');
const DEFAULT_TIMEOUT_MS = 10_000;

export interface MemoryRecallOptions {
  tags?: string[];
  strictTags?: boolean;
}

export interface MemoryRecallResult {
  memories: RecalledMemory[];
  mode: MemoryMode;
  status: 'recalled' | 'empty' | 'fallback' | 'unavailable';
  message: string;
  fallbackReason?: string;
}

export interface MemoryHealth {
  connected: boolean;
  mode: MemoryMode;
  persistent: boolean;
  configured: boolean;
  details: string;
}

export interface MemoryReflectionRequest {
  query: string;
  tags?: string[];
  strictTags?: boolean;
  responseSchema: Record<string, unknown>;
}

export interface MemoryReflectionResult {
  success: boolean;
  mode: MemoryMode;
  text?: string;
  structuredOutput?: Record<string, unknown>;
  errorCode?: RetentionResult['errorCode'];
  message?: string;
}

export interface MemoryProvider {
  /** Configured primary provider. Per-operation mode may be demo after a live outage. */
  mode: MemoryMode;
  persistent: boolean;
  retain(entry: MemoryEntry): Promise<RetentionResult>;
  recall(query: string, options?: MemoryRecallOptions): Promise<MemoryRecallResult>;
  list(options?: MemoryRecallOptions): Promise<MemoryEntry[]>;
  health(): Promise<MemoryHealth>;
  reflect(request: MemoryReflectionRequest): Promise<MemoryReflectionResult>;
}

function timeoutSignal(): AbortSignal {
  const configured = Number(process.env.HINDSIGHT_TIMEOUT_MS);
  const timeout = Number.isFinite(configured) && configured > 0
    ? Math.min(Math.floor(configured), 60_000)
    : DEFAULT_TIMEOUT_MS;
  return AbortSignal.timeout(timeout);
}

function errorCode(error: unknown): NonNullable<RetentionResult['errorCode']> {
  if (error instanceof HindsightError) {
    if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 422) return 'rejected';
    if (error.statusCode === 429 || error.statusCode === 502 || error.statusCode === 503) return 'unavailable';
  }
  if (error instanceof Error && /abort|timeout|timed out/i.test(error.message)) return 'timeout';
  return 'unavailable';
}

function errorMessage(code: NonNullable<RetentionResult['errorCode']>): string {
  switch (code) {
    case 'timeout':
      return 'Hindsight did not respond before the request timeout.';
    case 'rejected':
      return 'Hindsight rejected this request. Check the server, bank, and credentials.';
    case 'configuration':
      return 'Hindsight is not configured.';
    case 'unavailable':
      return 'Hindsight is currently unavailable.';
    default:
      return 'The memory operation could not be completed.';
  }
}

function normalizeTags(tags: string[] | undefined): string[] {
  return [...new Set((tags || []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

function memoryScopeToken(workspaceTag: string) {
  return workspaceTag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function scopeMemoryEntry(entry: MemoryEntry, workspaceTag: string): MemoryEntry {
  const normalizedWorkspaceTag = normalizeTags([workspaceTag])[0];
  const scopeToken = memoryScopeToken(normalizedWorkspaceTag);
  const idSuffix = entry.id.replace(/^mem-/, '');
  const scopedId = idSuffix.startsWith(`${scopeToken}-`)
    ? `mem-${idSuffix}`
    : `mem-${scopeToken}-${idSuffix}`;

  return {
    ...entry,
    id: scopedId,
    tags: normalizeTags([...entry.tags.filter((tag) => !tag.startsWith('workspace:')), normalizedWorkspaceTag]),
    metadata: { ...entry.metadata, workspace_scope: normalizedWorkspaceTag },
  };
}

function tokenize(value: string): string[] {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'was', 'are', 'has', 'have', 'api', 'service']);
  return [...new Set(
    value.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g)?.filter((word) => !stopWords.has(word)) || []
  )];
}

function matchedSymptoms(entry: MemoryEntry, query: string): string[] {
  const queryTokens = new Set(tokenize(query));
  return entry.symptoms.filter((symptom) => tokenize(symptom).some((word) => queryTokens.has(word)));
}

function fallbackRelevance(entry: MemoryEntry, query: string, tags?: string[]): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  const corpus = tokenize([
    entry.title,
    entry.service,
    entry.rootCause,
    entry.resolution,
    entry.lessonsLearned,
    ...entry.symptoms,
    ...(entry.errors || []),
    ...entry.tags,
  ].join(' '));
  const corpusTokens = new Set(corpus);
  const textOverlap = queryTokens.filter((word) => corpusTokens.has(word)).length / queryTokens.length;
  const queryTags = normalizeTags(tags);
  const entryTags = new Set(normalizeTags(entry.tags));
  const tagOverlap = queryTags.length === 0
    ? 0
    : queryTags.filter((tag) => entryTags.has(tag)).length / queryTags.length;

  return Math.min(1, Number((textOverlap * 0.8 + tagOverlap * 0.2).toFixed(3)));
}

function isMemoryEntry(value: unknown): value is MemoryEntry {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as MemoryEntry).id === 'string' &&
    typeof (value as MemoryEntry).incidentId === 'string' &&
    typeof (value as MemoryEntry).title === 'string'
  );
}

function parseEntrySnapshot(value: unknown): MemoryEntry | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return isMemoryEntry(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function entryFromFact(result: Pick<RecallResult, 'id' | 'text' | 'metadata' | 'tags' | 'occurred_start' | 'mentioned_at' | 'document_id'>): MemoryEntry {
  const snapshot = parseEntrySnapshot(result.metadata?.incident_snapshot);
  if (snapshot) return snapshot;

  return {
    id: result.metadata?.memory_id || result.id,
    incidentId: result.metadata?.incident_id || result.document_id || 'Unknown incident',
    title: result.metadata?.incident_title || 'Historical incident fact',
    service: result.metadata?.service || 'Unknown service',
    severity: (result.metadata?.severity as MemoryEntry['severity']) || 'SEV-3',
    symptoms: [],
    rootCause: result.text || 'Hindsight returned a related fact without a full incident snapshot.',
    attemptedActions: [],
    successfulActions: [],
    failedActions: [],
    resolution: '',
    outcome: (result.metadata?.outcome as MemoryEntry['outcome']) || 'partial',
    lessonsLearned: '',
    timestamp: result.occurred_start || result.mentioned_at || new Date().toISOString(),
    tags: result.tags || [],
    metadata: result.metadata || undefined,
  };
}

function serializeEntry(entry: MemoryEntry): string {
  return JSON.stringify(
    {
      schema_version: MEMORY_SCHEMA_VERSION,
      kind: 'resolved_incident_experience',
      incident: {
        id: entry.incidentId,
        title: entry.title,
        service: entry.service,
        severity: entry.severity,
        symptoms: entry.symptoms,
        logs: entry.logs || [],
        errors: entry.errors || [],
        timeline: entry.timeline || [],
        investigation_findings: entry.investigationFindings || [],
      },
      investigation: {
        root_cause: entry.rootCause,
        attempted_actions: entry.attemptedActions,
        failed_actions: entry.failedActions,
      },
      resolution: {
        successful_actions: entry.successfulActions,
        resolution: entry.resolution,
        outcome: entry.outcome,
        outcome_detail: entry.outcomeDetail || '',
        resolution_time_minutes: entry.resolutionTimeMinutes,
        lessons_learned: entry.lessonsLearned,
      },
      timestamp: entry.timestamp,
      tags: entry.tags,
      metadata: entry.metadata || {},
    },
    null,
    2
  );
}

function metadataFor(entry: MemoryEntry): Record<string, string> {
  return {
    memory_schema: MEMORY_SCHEMA_VERSION,
    memory_id: entry.id,
    incident_id: entry.incidentId,
    incident_title: entry.title,
    service: entry.service,
    severity: entry.severity,
    outcome: entry.outcome,
    incident_snapshot: JSON.stringify(entry),
    ...(entry.metadata || {}),
  };
}

class DiskDemoMemoryProvider implements MemoryProvider {
  mode = 'demo' as const;
  persistent = true;
  private memories = new Map<string, MemoryEntry>(demoMemories.map((entry) => [entry.id, entry]));
  private ready: Promise<void>;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.ready = this.load();
  }

  private async load(): Promise<void> {
    try {
      const raw = await readFile(FALLBACK_MEMORY_FILE, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      for (const entry of parsed) {
        if (isMemoryEntry(entry)) this.memories.set(entry.id, entry);
      }
    } catch (error: unknown) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
        console.warn('RECALL demo memory could not be loaded; starting from seeded demo data.');
      }
    }
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(FALLBACK_MEMORY_FILE), { recursive: true });
    const temp = `${FALLBACK_MEMORY_FILE}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify([...this.memories.values()], null, 2), 'utf8');
    await rename(temp, FALLBACK_MEMORY_FILE);
  }

  async retain(entry: MemoryEntry): Promise<RetentionResult> {
    await this.ready;
    this.memories.set(entry.id, entry);
    this.writeQueue = this.writeQueue.then(() => this.persist(), () => this.persist());
    try {
      await this.writeQueue;
      return {
        success: true,
        id: entry.id,
        mode: 'demo',
        persistent: true,
        message: 'Retained in the disk-backed development fallback, not Hindsight.',
      };
    } catch {
      return {
        success: false,
        id: entry.id,
        mode: 'demo',
        persistent: false,
        errorCode: 'unknown',
        message: 'The development fallback could not persist this experience.',
      };
    }
  }

  async recall(query: string, options: MemoryRecallOptions = {}): Promise<MemoryRecallResult> {
    await this.ready;
    const requiredTags = normalizeTags(options.tags);
    const memories = [...this.memories.values()]
      .filter((entry) => !options.strictTags || requiredTags.every((tag) => normalizeTags(entry.tags).includes(tag)))
      .map((memory) => ({
        memory,
        relevance: fallbackRelevance(memory, query, requiredTags),
        scoreAvailable: true,
        relevanceLabel: 'Fallback token-overlap score',
        matchedSymptoms: matchedSymptoms(memory, query),
        source: 'demo' as const,
        rank: 0,
      }))
      .filter((memory) => memory.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
      .map((memory, index) => ({ ...memory, rank: index + 1 }));

    return {
      memories,
      mode: 'demo',
      status: memories.length > 0 ? 'recalled' : 'empty',
      message: memories.length > 0
        ? 'Retrieved from the disk-backed development fallback, not Hindsight.'
        : 'No matching experience exists in the disk-backed development fallback.',
    };
  }

  async list(options: MemoryRecallOptions = {}): Promise<MemoryEntry[]> {
    await this.ready;
    const requiredTags = normalizeTags(options.tags);
    return [...this.memories.values()]
      .filter((entry) => !options.strictTags || requiredTags.every((tag) => normalizeTags(entry.tags).includes(tag)))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  async health(): Promise<MemoryHealth> {
    await this.ready;
    return {
      connected: false,
      mode: 'demo',
      persistent: true,
      configured: false,
      details: 'Development fallback active: disk-backed local memory. No live Hindsight service is configured.',
    };
  }

  async reflect(_request?: MemoryReflectionRequest): Promise<MemoryReflectionResult> {
    return {
      success: false,
      mode: 'demo',
      errorCode: 'configuration',
      message: 'Hindsight reflect is unavailable in development fallback mode.',
    };
  }
}

class HindsightMemoryProvider implements MemoryProvider {
  mode = 'hindsight' as const;
  persistent = true;
  private client: HindsightClient;

  constructor(private readonly bankId: string, baseUrl: string, apiKey?: string) {
    this.client = new HindsightClient({
      baseUrl: baseUrl.replace(/\/+$/, ''),
      apiKey: apiKey || undefined,
      userAgent: 'recall-incident-response/1.0',
    });
  }

  async retain(entry: MemoryEntry): Promise<RetentionResult> {
    try {
      const workspaceScope = normalizeTags(entry.tags).find((tag) => tag.startsWith('workspace:')) || 'workspace:unscoped';
      const response = await this.client.retain(this.bankId, serializeEntry(entry), {
        timestamp: entry.timestamp,
        context: 'Resolved production incident postmortem for future incident response.',
        metadata: metadataFor(entry),
        documentId: `incident:${memoryScopeToken(workspaceScope)}:${entry.incidentId}`,
        tags: normalizeTags(['recall:incident-response', ...entry.tags]),
        observationScopes: 'shared',
        signal: timeoutSignal(),
      });
      return {
        success: response.success,
        id: entry.id,
        mode: 'hindsight',
        persistent: response.success,
        message: response.success
          ? 'Retained in live Hindsight organizational memory.'
          : 'Hindsight did not confirm retention.',
      };
    } catch (error) {
      const code = errorCode(error);
      console.warn(`RECALL Hindsight retain failed (${code}).`);
      return {
        success: false,
        id: entry.id,
        mode: 'hindsight',
        persistent: false,
        errorCode: code,
        message: errorMessage(code),
      };
    }
  }

  async recall(query: string, options: MemoryRecallOptions = {}): Promise<MemoryRecallResult> {
    try {
      const response = await this.client.recall(this.bankId, query, {
        types: ['experience', 'world', 'observation'],
        budget: 'high',
        maxTokens: 4_000,
        includeChunks: true,
        tags: options.tags && options.tags.length > 0 ? normalizeTags(options.tags) : undefined,
        tagsMatch: options.strictTags ? 'all_strict' : undefined,
        signal: timeoutSignal(),
      });
      const byMemoryId = new Set<string>();
      const memories = response.results.reduce<RecalledMemory[]>((acc, result, index) => {
        const memory = entryFromFact(result);
        if (byMemoryId.has(memory.id)) return acc;
        byMemoryId.add(memory.id);
        const score = result.scores?.final;
        acc.push({
          memory,
          relevance: typeof score === 'number' ? score : 0,
          scoreAvailable: typeof score === 'number',
          relevanceLabel: 'Hindsight final ranking score',
          matchedSymptoms: matchedSymptoms(memory, query),
          source: 'hindsight',
          rank: index + 1,
          factId: result.id,
          factText: result.text,
        });
        return acc;
      }, []).slice(0, 5);

      return {
        memories,
        mode: 'hindsight',
        status: memories.length > 0 ? 'recalled' : 'empty',
        message: memories.length > 0
          ? 'Retrieved from live Hindsight organizational memory.'
          : 'Live Hindsight returned no historical experience for this query.',
      };
    } catch (error) {
      const code = errorCode(error);
      console.warn(`RECALL Hindsight recall failed (${code}).`);
      return {
        memories: [],
        mode: 'hindsight',
        status: 'unavailable',
        message: errorMessage(code),
      };
    }
  }

  async list(options: MemoryRecallOptions = {}): Promise<MemoryEntry[]> {
    const response = await this.client.listMemories(this.bankId, {
      limit: 100,
      signal: timeoutSignal(),
    });
    const entries = new Map<string, MemoryEntry>();
    for (const item of response.items) {
      const metadata = Object.fromEntries(
        Object.entries(item.metadata || {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      );
      const entry = entryFromFact({
        id: item.id,
        text: item.text || '',
        metadata,
        tags: item.tags || [],
        occurred_start: item.occurred_start,
        mentioned_at: item.mentioned_at,
        document_id: item.document_id,
      });
      entries.set(entry.id, entry);
    }
    const requiredTags = normalizeTags(options.tags);
    return [...entries.values()]
      .filter((entry) => !options.strictTags || requiredTags.every((tag) => normalizeTags(entry.tags).includes(tag)))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  async health(): Promise<MemoryHealth> {
    try {
      const version = await this.client.getVersion({ signal: timeoutSignal() });
      return {
        connected: true,
        mode: 'hindsight',
        persistent: true,
        configured: true,
        details: `Connected to live Hindsight${version.api_version ? ` v${version.api_version}` : ''}.`,
      };
    } catch (error) {
      const code = errorCode(error);
      return {
        connected: false,
        mode: 'hindsight',
        persistent: false,
        configured: true,
        details: `${errorMessage(code)} Development fallback remains available.`,
      };
    }
  }

  async reflect(request: MemoryReflectionRequest): Promise<MemoryReflectionResult> {
    try {
      const response = await this.client.reflect(this.bankId, request.query, {
        budget: 'high',
        tags: request.tags && request.tags.length > 0 ? normalizeTags(request.tags) : undefined,
        tagsMatch: request.strictTags ? 'all_strict' : undefined,
        responseSchema: request.responseSchema,
        includeFacts: true,
        signal: timeoutSignal(),
      });
      if (response.structured_output_error) {
        return {
          success: false,
          mode: 'hindsight',
          text: response.text,
          errorCode: 'unknown',
          message: 'Hindsight reflect completed, but structured incident analysis could not be parsed.',
        };
      }
      return {
        success: Boolean(response.structured_output),
        mode: 'hindsight',
        text: response.text,
        structuredOutput: response.structured_output || undefined,
        message: response.structured_output ? undefined : 'Hindsight reflect returned no structured incident analysis.',
      };
    } catch (error) {
      const code = errorCode(error);
      console.warn(`RECALL Hindsight reflect failed (${code}).`);
      return {
        success: false,
        mode: 'hindsight',
        errorCode: code,
        message: errorMessage(code),
      };
    }
  }
}

class ResilientMemoryProvider implements MemoryProvider {
  mode: MemoryMode;
  persistent = true;

  constructor(
    private readonly fallback: DiskDemoMemoryProvider,
    private readonly primary?: HindsightMemoryProvider
  ) {
    this.mode = primary ? 'hindsight' : 'demo';
  }

  async retain(entry: MemoryEntry): Promise<RetentionResult> {
    if (!this.primary) return this.fallback.retain(entry);
    const live = await this.primary.retain(entry);
    if (live.success) return live;
    const fallback = await this.fallback.retain(entry);
    return {
      ...fallback,
      fallbackReason: live.message,
      message: fallback.success
        ? 'Live Hindsight retention failed; retained only in the disk-backed development fallback.'
        : `${live.message} The development fallback also failed.`,
    };
  }

  async recall(query: string, options: MemoryRecallOptions = {}): Promise<MemoryRecallResult> {
    if (!this.primary) return this.fallback.recall(query, options);
    const live = await this.primary.recall(query, options);
    if (live.status !== 'unavailable') return live;
    const fallback = await this.fallback.recall(query, options);
    return {
      ...fallback,
      status: 'fallback',
      fallbackReason: live.message,
      message: fallback.memories.length > 0
        ? 'Live Hindsight recall failed; these results are from the disk-backed development fallback.'
        : 'Live Hindsight recall failed and the development fallback found no matching experience.',
    };
  }

  async list(options: MemoryRecallOptions = {}): Promise<MemoryEntry[]> {
    if (!this.primary) return this.fallback.list(options);
    try {
      return await this.primary.list(options);
    } catch (error) {
      console.warn(`RECALL Hindsight memory listing failed (${errorCode(error)}).`);
      return this.fallback.list(options);
    }
  }

  async health(): Promise<MemoryHealth> {
    return this.primary ? this.primary.health() : this.fallback.health();
  }

  async reflect(request: MemoryReflectionRequest): Promise<MemoryReflectionResult> {
    if (!this.primary) return this.fallback.reflect(request);
    return this.primary.reflect(request);
  }
}

export function buildMemoryEntry(incident: Incident, resolution: ResolutionForm, workspaceTag?: string): MemoryEntry {
  const attemptedActions = resolution.attemptedActions?.length
    ? resolution.attemptedActions
    : [resolution.actionTaken];
  const failedActions = resolution.failedActions?.length
    ? resolution.failedActions
    : resolution.outcome === 'failed'
      ? [resolution.actionTaken]
      : [];
  const successfulActions = resolution.outcome === 'successful' ? [resolution.actionTaken] : [];
  const errors = [incident.errorInfo, ...incident.logs.filter((line) => /\b(error|exception|failed|timeout)\b/i.test(line))]
    .filter((value): value is string => Boolean(value));

  const entry: MemoryEntry = {
    id: `mem-${incident.id.toLowerCase()}`,
    incidentId: incident.id,
    title: incident.title,
    service: incident.service,
    severity: incident.severity,
    symptoms: incident.symptoms,
    logs: incident.logs,
    errors,
    timeline: incident.timeline || [],
    investigationFindings: resolution.investigationFindings || incident.investigationFindings || [],
    rootCause: resolution.rootCause || incident.rootCause || '',
    attemptedActions,
    successfulActions,
    failedActions,
    resolution: resolution.actionTaken,
    outcome: resolution.outcome,
    outcomeDetail: resolution.result,
    resolutionTimeMinutes: resolution.resolutionTimeMinutes,
    lessonsLearned: resolution.additionalLesson || incident.lessonsLearned || '',
    timestamp: new Date().toISOString(),
    tags: normalizeTags(['recall:incident-response', ...incident.tags, ...(workspaceTag ? [workspaceTag] : [])]),
    metadata: {
      source: 'recall',
      incident_status: 'resolved',
      ...(incident.tags.some((tag) => tag.startsWith('demo:'))
        ? { demo_scope: incident.tags.find((tag) => tag.startsWith('demo:')) || '' }
        : {}),
      ...(workspaceTag ? { workspace_scope: workspaceTag } : {}),
    },
  };

  return workspaceTag ? scopeMemoryEntry(entry, workspaceTag) : entry;
}

type DemoRunGlobal = typeof globalThis & { recallDemoScope?: string };
const demoRunGlobal = globalThis as DemoRunGlobal;

export function resetDemoScope(): string {
  const scope = `demo:run:${randomUUID()}`;
  demoRunGlobal.recallDemoScope = scope;
  return scope;
}

export function getDemoScope(): string {
  return demoRunGlobal.recallDemoScope || resetDemoScope();
}

type ProviderGlobal = typeof globalThis & { recallMemoryProvider?: MemoryProvider };
const providerGlobal = globalThis as ProviderGlobal;

export function getMemoryProvider(): MemoryProvider {
  if (providerGlobal.recallMemoryProvider) return providerGlobal.recallMemoryProvider;

  const fallback = new DiskDemoMemoryProvider();
  const baseUrl = process.env.HINDSIGHT_BASE_URL?.trim();
  const bankId = process.env.HINDSIGHT_BANK_ID?.trim();
  const apiKey = process.env.HINDSIGHT_API_KEY?.trim();
  const primary = baseUrl && bankId ? new HindsightMemoryProvider(bankId, baseUrl, apiKey) : undefined;

  providerGlobal.recallMemoryProvider = new ResilientMemoryProvider(fallback, primary);
  return providerGlobal.recallMemoryProvider;
}
