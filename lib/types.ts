// ============================================================
// RECALL — Core Type Definitions
// ============================================================

export type Severity = 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';

export type IncidentStatus =
  | 'triggered'
  | 'investigating'
  | 'identified'
  | 'resolved'
  | 'postmortem';

export type ResolutionOutcome = 'successful' | 'partial' | 'failed';
export type MemoryMode = 'hindsight' | 'demo';

export interface IncidentTimelineEvent {
  timestamp: string;
  event: string;
  source?: string;
}

export interface Incident {
  id: string;
  incidentNumber?: string;
  title: string;
  description?: string;
  service: string;
  severity: Severity;
  status: IncidentStatus;
  impact?: string;
  triggeredAt: string; // ISO datetime
  resolvedAt?: string;
  symptoms: string[];
  logs: string[];
  errorInfo?: string;
  timeline?: IncidentTimelineEvent[];
  investigationFindings?: string[];
  rootCause?: string;
  resolution?: string;
  resolutionOutcome?: ResolutionOutcome;
  lessonsLearned?: string;
  memoryUsed: boolean;
  memoryIds?: string[]; // IDs of recalled memories
  tags: string[];
  createdBy?: string;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ReportType =
  | 'incident'
  | 'weekly_summary'
  | 'system_health'
  | 'incident_analysis'
  | 'performance';

export interface ReportRecord {
  id: string;
  organizationId: string;
  title: string;
  reportType: ReportType;
  summary: string;
  data: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
}


export interface MemoryEntry {
  id: string;
  incidentId: string;
  title: string;
  service: string;
  severity: Severity;
  symptoms: string[];
  logs?: string[];
  errors?: string[];
  timeline?: IncidentTimelineEvent[];
  investigationFindings?: string[];
  rootCause: string;
  attemptedActions: string[];
  successfulActions: string[];
  failedActions: string[];
  resolution: string;
  outcome: ResolutionOutcome;
  outcomeDetail?: string;
  resolutionTimeMinutes?: number;
  lessonsLearned: string;
  timestamp: string;
  tags: string[];
  metadata?: Record<string, string>;
}

export interface RecalledMemory {
  memory: MemoryEntry;
  /** Provider ranking value. It is not a probability or model confidence. */
  relevance: number;
  scoreAvailable: boolean;
  relevanceLabel: string;
  matchedSymptoms: string[];
  source: MemoryMode;
  rank: number;
  factId?: string;
  factText?: string;
}

export interface MemoryRecallState {
  mode: MemoryMode;
  status: 'recalled' | 'empty' | 'fallback' | 'unavailable';
  message: string;
  retrievedCount: number;
  usedMemoryIds: string[];
}

export interface InvestigationStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  detail?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface InvestigationResult {
  incidentId: string;
  summary: string;
  historicalContext: string;
  likelyRootCause: string;
  evidence: string[];
  recommendedActions: string[];
  whyTheseActions: string;
  confidence: number; // 0-1
  uncertainties: string[];
  previousExperienceUsed: RecalledMemory[];
  memoryRecall: MemoryRecallState;
  agentMode: 'hindsight-reflect' | 'deterministic-fallback';
  agentWarnings: string[];
  steps: InvestigationStep[];
  timestamp: string;
}

export interface ResolutionForm {
  incidentId: string;
  outcome: ResolutionOutcome;
  rootCause: string;
  actionTaken: string;
  result: string;
  resolutionTimeMinutes: number;
  additionalLesson: string;
  attemptedActions?: string[];
  failedActions?: string[];
  investigationFindings?: string[];
}

export interface RetentionResult {
  success: boolean;
  id: string;
  mode: MemoryMode;
  persistent: boolean;
  operationId?: string;
  errorCode?: 'configuration' | 'timeout' | 'unavailable' | 'rejected' | 'unknown';
  message: string;
  fallbackReason?: string;
}

export interface DemoState {
  phase: number;
  totalPhases: number;
  currentPhaseLabel: string;
  isRunning: boolean;
  incident1?: Incident;
  incident2?: Incident;
  investigation1?: InvestigationResult;
  investigation2?: InvestigationResult;
  memoryStored?: boolean;
  memoryRecalled?: boolean;
}

export interface DashboardStats {
  activeIncidents: number;
  criticalIncidents: number;
  resolvedIncidents: number;
  avgResolutionMinutes: number;
  aiAssistedResolutions: number;
  memoryAssistedInvestigations: number;
  totalMemories: number;
  successfulResolutions: number;
  lessonsLearned: number;
  recurringPatterns: number;
}

export interface AnalyticsData {
  incidentsOverTime: { date: string; count: number }[];
  severityDistribution: { severity: Severity; count: number }[];
  topServices: { service: string; count: number }[];
  topRootCauses: { cause: string; count: number }[];
  resolutionTimeTrend: { date: string; avgMinutes: number }[];
  memoryUsageTrend: { date: string; recalls: number; retains: number }[];
}

export interface AppSettings {
  hindsightConnected: boolean;
  hindsightBaseUrl?: string;
  aiProviderConnected: boolean;
  aiProvider?: string;
  demoMode: boolean;
}
