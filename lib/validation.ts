import type { Incident, MemoryEntry, ResolutionForm, ResolutionOutcome, Severity } from './types';

const severities = new Set<Severity>(['SEV-1', 'SEV-2', 'SEV-3', 'SEV-4']);
const statuses = new Set<Incident['status']>(['triggered', 'investigating', 'identified', 'resolved', 'postmortem']);
const outcomes = new Set<ResolutionOutcome>(['successful', 'partial', 'failed']);

export type ParseResult<T> = { value: T } | { error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, field: string, required = true, max = 8_000): string | undefined {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${field} is required`);
    return undefined;
  }
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  const trimmed = value.trim();
  if (required && trimmed.length === 0) throw new Error(`${field} is required`);
  if (trimmed.length > max) throw new Error(`${field} is too long`);
  return trimmed;
}

function textList(value: unknown, field: string, maxItems = 100, maxItemLength = 8_000): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => typeof item !== 'string' || item.length > maxItemLength)) {
    throw new Error(`${field} must be an array of up to ${maxItems} strings`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function optionalMetadata(value: unknown): Record<string, string> | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) throw new Error('metadata must be an object of string values');
  const entries = Object.entries(value);
  if (entries.length > 30 || entries.some(([key, item]) => key.length > 100 || typeof item !== 'string' || item.length > 16_000)) {
    throw new Error('metadata contains an invalid key or value');
  }
  return Object.fromEntries(entries) as Record<string, string>;
}

export function parseIncident(value: unknown): ParseResult<Incident> {
  try {
    if (!isRecord(value)) throw new Error('incident must be an object');
    const id = text(value.id, 'incident.id', true, 120)!;
    const title = text(value.title, 'incident.title', true, 500)!;
    const service = text(value.service, 'incident.service', true, 250)!;
    const severity = text(value.severity, 'incident.severity', true, 10) as Severity;
    const status = text(value.status, 'incident.status', true, 30) as Incident['status'];
    const triggeredAt = text(value.triggeredAt, 'incident.triggeredAt', true, 64)!;
    if (!severities.has(severity)) throw new Error('incident.severity is invalid');
    if (!statuses.has(status)) throw new Error('incident.status is invalid');
    if (Number.isNaN(Date.parse(triggeredAt))) throw new Error('incident.triggeredAt must be an ISO date');

    return {
      value: {
        id,
        title,
        service,
        severity,
        status,
        triggeredAt,
        resolvedAt: text(value.resolvedAt, 'incident.resolvedAt', false, 64),
        symptoms: textList(value.symptoms, 'incident.symptoms', 50),
        logs: textList(value.logs, 'incident.logs', 200, 12_000),
        errorInfo: text(value.errorInfo, 'incident.errorInfo', false),
        rootCause: text(value.rootCause, 'incident.rootCause', false),
        resolution: text(value.resolution, 'incident.resolution', false),
        resolutionOutcome: value.resolutionOutcome === undefined
          ? undefined
          : outcomes.has(value.resolutionOutcome as ResolutionOutcome)
            ? value.resolutionOutcome as ResolutionOutcome
            : (() => { throw new Error('incident.resolutionOutcome is invalid'); })(),
        lessonsLearned: text(value.lessonsLearned, 'incident.lessonsLearned', false),
        memoryUsed: value.memoryUsed === true,
        memoryIds: textList(value.memoryIds, 'incident.memoryIds', 20, 200),
        tags: textList(value.tags, 'incident.tags', 30, 120),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid incident input' };
  }
}

export function parseResolutionForm(value: unknown): ParseResult<ResolutionForm> {
  try {
    if (!isRecord(value)) throw new Error('resolution must be an object');
    const outcome = text(value.outcome, 'outcome', true, 20) as ResolutionOutcome;
    if (!outcomes.has(outcome)) throw new Error('outcome is invalid');
    const resolutionTimeMinutes = value.resolutionTimeMinutes;
    if (typeof resolutionTimeMinutes !== 'number' || !Number.isFinite(resolutionTimeMinutes) || resolutionTimeMinutes < 0 || resolutionTimeMinutes > 43_200) {
      throw new Error('resolutionTimeMinutes must be a valid number of minutes');
    }
    return {
      value: {
        incidentId: text(value.incidentId, 'incidentId', true, 120)!,
        outcome,
        rootCause: text(value.rootCause, 'rootCause', true)!,
        actionTaken: text(value.actionTaken, 'actionTaken', true)!,
        result: text(value.result, 'result', true)!,
        resolutionTimeMinutes,
        additionalLesson: text(value.additionalLesson, 'additionalLesson', false) || '',
        attemptedActions: textList(value.attemptedActions, 'attemptedActions', 30),
        failedActions: textList(value.failedActions, 'failedActions', 30),
        investigationFindings: textList(value.investigationFindings, 'investigationFindings', 50),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid resolution input' };
  }
}

export function parseMemoryEntry(value: unknown): ParseResult<MemoryEntry> {
  try {
    if (!isRecord(value)) throw new Error('memory entry must be an object');
    const outcome = text(value.outcome, 'outcome', true, 20) as ResolutionOutcome;
    const severity = text(value.severity, 'severity', true, 10) as Severity;
    if (!outcomes.has(outcome)) throw new Error('outcome is invalid');
    if (!severities.has(severity)) throw new Error('severity is invalid');
    return {
      value: {
        id: text(value.id, 'id', true, 160)!,
        incidentId: text(value.incidentId, 'incidentId', true, 120)!,
        title: text(value.title, 'title', true, 500)!,
        service: text(value.service, 'service', true, 250)!,
        severity,
        symptoms: textList(value.symptoms, 'symptoms', 50),
        logs: textList(value.logs, 'logs', 200, 12_000),
        errors: textList(value.errors, 'errors', 100, 12_000),
        rootCause: text(value.rootCause, 'rootCause', true)!,
        attemptedActions: textList(value.attemptedActions, 'attemptedActions', 30),
        successfulActions: textList(value.successfulActions, 'successfulActions', 30),
        failedActions: textList(value.failedActions, 'failedActions', 30),
        resolution: text(value.resolution, 'resolution', true)!,
        outcome,
        outcomeDetail: text(value.outcomeDetail, 'outcomeDetail', false),
        resolutionTimeMinutes: typeof value.resolutionTimeMinutes === 'number' && Number.isFinite(value.resolutionTimeMinutes)
          ? value.resolutionTimeMinutes
          : undefined,
        lessonsLearned: text(value.lessonsLearned, 'lessonsLearned', false) || '',
        timestamp: text(value.timestamp, 'timestamp', false, 64) || new Date().toISOString(),
        tags: textList(value.tags, 'tags', 30, 120),
        metadata: optionalMetadata(value.metadata),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid memory entry' };
  }
}
