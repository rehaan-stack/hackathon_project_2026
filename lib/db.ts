import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Incident, IncidentStatus, Severity } from './types';
import { FirestoreDatabaseRepository } from './firestore-db';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
  organization_id: string;
  created_at: string;
}

export interface IncidentEvent {
  id: string;
  organization_id: string;
  incident_id: string;
  event_type:
    | 'INCIDENT_CREATED'
    | 'AI_INVESTIGATION_STARTED'
    | 'INVESTIGATION_STARTED'
    | 'MEMORY_RECALLED'
    | 'FINDING_CREATED'
    | 'ROOT_CAUSE_IDENTIFIED'
    | 'ACTION_RECOMMENDED'
    | 'ACTION_EXECUTED'
    | 'RESOLUTION_APPLIED'
    | 'RESOLUTION_VERIFIED'
    | 'MEMORY_RETAINED'
    | 'INCIDENT_RESOLVED'
    | 'INCIDENT_REOPENED'
    | 'EVENT_ADDED';
  message: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DBInvestigation {
  id: string;
  organization_id: string;
  incident_id: string;
  status: string;
  summary: string;
  likely_root_cause: string;
  confidence: number;
  started_at: string;
  completed_at: string;
  findings?: Array<{
    type: string;
    finding: string;
    evidence?: string;
    source: string;
  }>;
}

export interface DBResolution {
  id: string;
  organization_id: string;
  incident_id: string;
  root_cause: string;
  actions_taken: string;
  outcome: string;
  resolution_time_minutes: number;
  lessons_learned?: string;
  verified: boolean;
  hindsight_memory_id?: string;
  created_at: string;
}

export interface DBReportRecord {
  id: string;
  organization_id: string;
  title: string;
  report_type: 'incident' | 'weekly_summary' | 'system_health' | 'incident_analysis' | 'performance';
  summary: string;
  data: Record<string, unknown>;
  created_by?: string;
  created_at: string;
}

export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

// -------------------------------------------------------------
// Database Repository Interface & Implementations
// -------------------------------------------------------------

interface DBIncidentRecord {
  id: string;
  organization_id: string;
  incident_number: string;
  title: string;
  description?: string;
  service: string;
  severity: Severity;
  status: IncidentStatus;
  impact?: string;
  detected_at: string;
  resolved_at?: string;
  root_cause?: string;
  symptoms: string[];
  logs: string[];
  memory_used: boolean;
  memory_ids: string[];
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

interface DiskDatabase {
  organizations: Organization[];
  profiles: UserProfile[];
  incidents: DBIncidentRecord[];
  incident_events: IncidentEvent[];
  investigations: DBInvestigation[];
  resolutions: DBResolution[];
  reports: DBReportRecord[];
}

class DatabaseRepository {
  private supabase: SupabaseClient | null = null;
  private dbPath: string;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
      } catch (err) {
        console.warn('Supabase initialization fallback:', err);
      }
    }

    this.dbPath = path.resolve(process.cwd(), '.recall_db', 'database.json');
    this.ensureInitialized();
  }

  private ensureInitialized() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(this.dbPath)) {
      const initialData: DiskDatabase = {
        organizations: [
          {
            id: DEFAULT_ORG_ID,
            name: 'RECALL Engineering',
            slug: 'recall-engineering',
            created_at: '2025-01-01T00:00:00Z',
          },
        ],
        profiles: [],
        incidents: [
          {
            id: 'INC-1091',
            organization_id: DEFAULT_ORG_ID,
            incident_number: '1091',
            title: 'Checkout API latency spike',
            service: 'checkout-service',
            severity: 'SEV-2' as Severity,
            status: 'investigating' as IncidentStatus,
            detected_at: '2025-09-28T10:12:00Z',
            symptoms: [
              'p95 latency exceeded 2400ms on checkout endpoint',
              'Connection pool utilization reached 96%',
            ],
            logs: [
              '[WARN] checkout-api: Connection pool wait queue > 500ms',
              '[ERROR] checkout-api: Downstream database query timed out',
            ],
            memory_used: true,
            memory_ids: ['mem-inc-1042'],
            created_by: 'system',
            created_at: '2025-09-28T10:12:00Z',
          },
          {
            id: 'INC-1090',
            organization_id: DEFAULT_ORG_ID,
            incident_number: '1090',
            title: 'Payment service errors',
            service: 'payment-service',
            severity: 'SEV-1' as Severity,
            status: 'triggered' as IncidentStatus,
            detected_at: '2025-09-28T09:47:00Z',
            symptoms: [
              'HTTP 502 Bad Gateway surging on /v1/charge',
              'Deadlock alerts on transaction table',
            ],
            logs: [
              '[CRITICAL] payment-gateway: Transaction deadlocks exceeded threshold',
              '[ERROR] payment-gateway: Lock acquisition failed after 5000ms',
            ],
            memory_used: false,
            memory_ids: [],
            created_by: 'system',
            created_at: '2025-09-28T09:47:00Z',
          },
          {
            id: 'INC-1089',
            organization_id: DEFAULT_ORG_ID,
            incident_number: '1089',
            title: 'User profile sync issue',
            service: 'user-service',
            severity: 'SEV-4' as Severity,
            status: 'resolved' as IncidentStatus,
            detected_at: '2025-09-28T08:32:00Z',
            resolved_at: '2025-09-28T09:10:00Z',
            root_cause: 'Redis cache desynchronization after rolling restart.',
            symptoms: ['Profile updates not reflecting immediately'],
            logs: ['[INFO] user-service: Cache purge completed successfully'],
            memory_used: true,
            memory_ids: ['mem-inc-1011'],
            created_by: 'system',
            created_at: '2025-09-28T08:32:00Z',
          },
          {
            id: 'INC-1088',
            organization_id: DEFAULT_ORG_ID,
            incident_number: '1088',
            title: 'Notification service delay',
            service: 'notification-service',
            severity: 'SEV-3' as Severity,
            status: 'investigating' as IncidentStatus,
            detected_at: '2025-09-27T18:21:00Z',
            symptoms: ['SMS/Email dispatch queue backlog > 12,000 items'],
            logs: ['[WARN] notification-worker: Rate limit reached on Twilio provider'],
            memory_used: false,
            memory_ids: [],
            created_by: 'system',
            created_at: '2025-09-27T18:21:00Z',
          },
          {
            id: 'INC-1087',
            organization_id: DEFAULT_ORG_ID,
            incident_number: '1087',
            title: 'Upload errors',
            service: 'upload-service',
            severity: 'SEV-4' as Severity,
            status: 'resolved' as IncidentStatus,
            detected_at: '2025-09-27T16:18:00Z',
            resolved_at: '2025-09-27T16:45:00Z',
            root_cause: 'S3 multipart upload token expiration.',
            symptoms: ['Asset uploads intermittently failing at 99%'],
            logs: ['[ERROR] upload-service: Presigned URL expired during chunk transfer'],
            memory_used: true,
            memory_ids: ['mem-inc-0988'],
            created_by: 'system',
            created_at: '2025-09-27T16:18:00Z',
          },
        ],
        incident_events: [
          {
            id: randomUUID(),
            organization_id: DEFAULT_ORG_ID,
            incident_id: 'INC-1090',
            event_type: 'INCIDENT_CREATED',
            message: 'Incident INC-1090 triggered by anomaly detection agent.',
            created_at: '2025-09-28T09:47:00Z',
          },
          {
            id: randomUUID(),
            organization_id: DEFAULT_ORG_ID,
            incident_id: 'INC-1090',
            event_type: 'AI_INVESTIGATION_STARTED',
            message: 'RECALL autonomous AI agent initiated diagnostic review.',
            created_at: '2025-09-28T09:48:00Z',
          },
        ],
        investigations: [],
        resolutions: [],
        reports: [],
      };

      fs.writeFileSync(this.dbPath, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  }

  private readDiskDB(): DiskDatabase {
    try {
      const db = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8')) as DiskDatabase;
      db.reports = db.reports || [];
      db.investigations = db.investigations || [];
      db.resolutions = db.resolutions || [];
      db.incident_events = db.incident_events || [];
      db.incidents = db.incidents || [];
      return db;
    } catch {
      this.ensureInitialized();
      const db = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8')) as DiskDatabase;
      db.reports = db.reports || [];
      db.investigations = db.investigations || [];
      db.resolutions = db.resolutions || [];
      db.incident_events = db.incident_events || [];
      db.incidents = db.incidents || [];
      return db;
    }
  }

  private writeDiskDB(data: DiskDatabase) {
    fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // --- Incidents ---
  async getIncidents(orgId: string = DEFAULT_ORG_ID): Promise<Incident[]> {
    if (this.supabase) {
      const { data } = await this.supabase
        .from('incidents')
        .select('*')
        .eq('organization_id', orgId)
        .order('detected_at', { ascending: false });
      if (data && data.length > 0) {
        return data.map((d) => this.mapDbIncidentToIncident(d));
      }
    }

    const db = this.readDiskDB();
    const rows = (db.incidents || []).filter(
      (inc) => !orgId || inc.organization_id === orgId
    );
    return rows.map((r) => this.mapDbIncidentToIncident(r));
  }

  async getIncidentById(id: string, orgId: string = DEFAULT_ORG_ID): Promise<Incident | null> {
    if (this.supabase) {
      const { data } = await this.supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();
      if (data) return this.mapDbIncidentToIncident(data);
    }

    const db = this.readDiskDB();
    const found = (db.incidents || []).find(
      (inc) => inc.id === id && (!orgId || inc.organization_id === orgId)
    );
    return found ? this.mapDbIncidentToIncident(found) : null;
  }

  async createIncident(
    incident: Partial<Incident> & { title: string; service: string },
    orgId: string = DEFAULT_ORG_ID,
    userId: string = DEFAULT_USER_ID
  ): Promise<Incident> {
    const id = incident.id || `INC-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();
    const newRecord: DBIncidentRecord = {
      id,
      organization_id: orgId,
      incident_number: incident.incidentNumber || id.replace('INC-', ''),
      title: incident.title,
      description: incident.description || incident.errorInfo || incident.title,
      service: incident.service,
      severity: (incident.severity || 'SEV-2') as Severity,
      status: (incident.status || 'triggered') as IncidentStatus,
      impact: incident.impact || (incident.severity === 'SEV-1' ? 'High Customer Impact' : 'Internal Service Degradation'),
      detected_at: incident.triggeredAt || nowIso,
      symptoms: incident.symptoms || [],
      logs: incident.logs || [],
      memory_used: Boolean(incident.memoryUsed),
      memory_ids: incident.memoryIds || [],
      created_by: userId,
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (this.supabase) {
      await this.supabase.from('incidents').insert(newRecord);
    }

    const db = this.readDiskDB();
    db.incidents = [newRecord, ...(db.incidents || [])];
    this.writeDiskDB(db);

    // Record Event
    await this.createIncidentEvent({
      id: randomUUID(),
      organization_id: orgId,
      incident_id: id,
      event_type: 'INCIDENT_CREATED',
      message: `Incident ${id} created for ${incident.service}.`,
      created_at: nowIso,
    });

    return this.mapDbIncidentToIncident(newRecord);
  }

  async updateIncident(
    id: string,
    updates: Partial<Incident>,
    orgId: string = DEFAULT_ORG_ID
  ): Promise<Incident | null> {
    const nowIso = new Date().toISOString();
    if (this.supabase) {
      await this.supabase
        .from('incidents')
        .update({
          title: updates.title,
          description: updates.description,
          service: updates.service,
          severity: updates.severity,
          status: updates.status,
          impact: updates.impact,
          root_cause: updates.rootCause,
          resolved_at: updates.resolvedAt,
          memory_used: updates.memoryUsed,
          memory_ids: updates.memoryIds,
          updated_at: nowIso,
        })
        .eq('id', id)
        .eq('organization_id', orgId);
    }

    const db = this.readDiskDB();
    const idx = (db.incidents || []).findIndex(
      (i: DBIncidentRecord) => i.id === id && (!orgId || i.organization_id === orgId)
    );
    if (idx !== -1) {
      db.incidents[idx] = {
        ...db.incidents[idx],
        ...updates,
        title: updates.title || db.incidents[idx].title,
        description: updates.description !== undefined ? updates.description : db.incidents[idx].description,
        service: updates.service || db.incidents[idx].service,
        severity: (updates.severity || db.incidents[idx].severity) as Severity,
        status: (updates.status || db.incidents[idx].status) as IncidentStatus,
        impact: updates.impact !== undefined ? updates.impact : db.incidents[idx].impact,
        root_cause: updates.rootCause || db.incidents[idx].root_cause,
        resolved_at: updates.resolvedAt || db.incidents[idx].resolved_at,
        memory_used:
          updates.memoryUsed !== undefined
            ? updates.memoryUsed
            : db.incidents[idx].memory_used,
        memory_ids: updates.memoryIds || db.incidents[idx].memory_ids,
        updated_at: nowIso,
      };
      this.writeDiskDB(db);
      return this.mapDbIncidentToIncident(db.incidents[idx]);
    }
    return null;
  }

  async deleteIncident(id: string, orgId: string = DEFAULT_ORG_ID): Promise<boolean> {
    if (this.supabase) {
      await this.supabase.from('incidents').delete().eq('id', id).eq('organization_id', orgId);
    }
    const db = this.readDiskDB();
    const prev = (db.incidents || []).length;
    db.incidents = (db.incidents || []).filter(
      (inc) => !(inc.id === id && (!orgId || inc.organization_id === orgId))
    );
    if (db.incidents.length < prev) {
      this.writeDiskDB(db);
      return true;
    }
    return false;
  }

  async addIncidentEvent(
    incidentId: string,
    eventType: IncidentEvent['event_type'],
    message: string,
    metadata?: Record<string, unknown>,
    orgId: string = DEFAULT_ORG_ID
  ): Promise<IncidentEvent> {
    const event: IncidentEvent = {
      id: randomUUID(),
      organization_id: orgId,
      incident_id: incidentId,
      event_type: eventType,
      message,
      metadata,
      created_at: new Date().toISOString(),
    };
    await this.createIncidentEvent(event);
    return event;
  }

  // --- Incident Events ---
  async getIncidentEvents(incidentId: string, orgId: string = DEFAULT_ORG_ID): Promise<IncidentEvent[]> {
    if (this.supabase) {
      const { data } = await this.supabase
        .from('incident_events')
        .select('*')
        .eq('incident_id', incidentId)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });
      if (data) return data;
    }

    const db = this.readDiskDB();
    return (db.incident_events || []).filter(
      (ev: IncidentEvent) => ev.incident_id === incidentId && (!orgId || ev.organization_id === orgId)
    );
  }

  async createIncidentEvent(event: IncidentEvent): Promise<void> {
    if (this.supabase) {
      await this.supabase.from('incident_events').insert(event);
    }

    const db = this.readDiskDB();
    db.incident_events = [...(db.incident_events || []), event];
    this.writeDiskDB(db);
  }

  // --- Investigations ---
  async createInvestigation(inv: DBInvestigation): Promise<void> {
    if (this.supabase) {
      await this.supabase.from('investigations').insert({
        id: inv.id,
        organization_id: inv.organization_id,
        incident_id: inv.incident_id,
        status: inv.status,
        summary: inv.summary,
        likely_root_cause: inv.likely_root_cause,
        confidence: inv.confidence,
        started_at: inv.started_at,
        completed_at: inv.completed_at,
      });
    }

    const db = this.readDiskDB();
    db.investigations = [...(db.investigations || []), inv];
    this.writeDiskDB(db);

    await this.createIncidentEvent({
      id: randomUUID(),
      organization_id: inv.organization_id,
      incident_id: inv.incident_id,
      event_type: 'AI_INVESTIGATION_STARTED',
      message: `Investigation completed with ${(inv.confidence * 100).toFixed(0)}% confidence.`,
      metadata: { root_cause: inv.likely_root_cause },
      created_at: new Date().toISOString(),
    });
  }

  async getInvestigationById(id: string, orgId: string = DEFAULT_ORG_ID): Promise<DBInvestigation | null> {
    if (this.supabase) {
      const { data } = await this.supabase
        .from('investigations')
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();
      if (data) return data as DBInvestigation;
    }

    const db = this.readDiskDB();
    const found = (db.investigations || []).find(
      (inv) => inv.id === id && (!orgId || inv.organization_id === orgId)
    );
    return found || null;
  }

  // --- Resolutions ---
  async createResolution(res: DBResolution): Promise<void> {
    if (this.supabase) {
      await this.supabase.from('resolutions').insert(res);
    }

    const db = this.readDiskDB();
    db.resolutions = [...(db.resolutions || []), res];
    this.writeDiskDB(db);

    // Update incident status to resolved
    await this.updateIncident(res.incident_id, {
      status: 'resolved',
      resolvedAt: res.created_at,
      rootCause: res.root_cause,
    }, res.organization_id);

    await this.createIncidentEvent({
      id: randomUUID(),
      organization_id: res.organization_id,
      incident_id: res.incident_id,
      event_type: 'RESOLUTION_VERIFIED',
      message: `Resolution verified: ${res.actions_taken}.`,
      metadata: { outcome: res.outcome },
      created_at: new Date().toISOString(),
    });

    if (res.hindsight_memory_id) {
      await this.createIncidentEvent({
        id: randomUUID(),
        organization_id: res.organization_id,
        incident_id: res.incident_id,
        event_type: 'MEMORY_RETAINED',
        message: `Experience retained into Hindsight organizational memory (${res.hindsight_memory_id}).`,
        metadata: { memory_id: res.hindsight_memory_id },
        created_at: new Date().toISOString(),
      });
    }
  }

  // --- User Profiles & Organizations ---
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (this.supabase) {
      const { data } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (data) return data;
    }
    const db = this.readDiskDB();
    const found = (db.profiles || []).find((p: UserProfile) => p.user_id === userId);
    return found || null;
  }

  async getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    if (this.supabase) {
      const { data } = await this.supabase
        .from('profiles')
        .select('*')
        .ilike('email', email)
        .single();
      if (data) return data;
    }
    const db = this.readDiskDB();
    const found = (db.profiles || []).find(
      (p: UserProfile) => p.email && p.email.toLowerCase() === email.toLowerCase()
    );
    return found || null;
  }

  async createProfile(profile: Partial<UserProfile> & { email: string; user_id: string }): Promise<UserProfile> {
    const newRecord: UserProfile = {
      id: profile.id || randomUUID(),
      user_id: profile.user_id,
      full_name: profile.full_name || profile.email.split('@')[0],
      email: profile.email,
      avatar_url: profile.avatar_url,
      role: profile.role || 'SRE Engineer',
      organization_id: profile.organization_id || DEFAULT_ORG_ID,
      created_at: new Date().toISOString(),
    };

    if (this.supabase) {
      await this.supabase.from('profiles').insert(newRecord);
    }

    const db = this.readDiskDB();
    db.profiles = [...(db.profiles || []), newRecord];
    this.writeDiskDB(db);
    return newRecord;
  }

  async updateUserProfile(
    userId: string,
    updates: Pick<Partial<UserProfile>, 'full_name' | 'role'>
  ): Promise<UserProfile | null> {
    if (this.supabase) {
      const { data } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (data) return data;
    }

    const db = this.readDiskDB();
    const index = (db.profiles || []).findIndex((profile: UserProfile) => profile.user_id === userId);
    if (index === -1) return null;
    const updated = { ...db.profiles[index], ...updates };
    db.profiles[index] = updated;
    this.writeDiskDB(db);
    return updated;
  }

  async updateOrganizationName(orgId: string, name: string): Promise<Organization | null> {
    if (this.supabase) {
      const { data } = await this.supabase
        .from('organizations')
        .update({ name })
        .eq('id', orgId)
        .select('*')
        .single();
      if (data) return data;
    }

    const db = this.readDiskDB();
    const index = (db.organizations || []).findIndex((organization: Organization) => organization.id === orgId);
    if (index === -1) return null;
    const updated = { ...db.organizations[index], name };
    db.organizations[index] = updated;
    this.writeDiskDB(db);
    return updated;
  }

  async getOrganization(orgId: string): Promise<Organization | null> {
    if (this.supabase) {
      const { data } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      if (data) return data;
    }
    const db = this.readDiskDB();
    const found = (db.organizations || []).find((o: Organization) => o.id === orgId);
    return found || null;
  }

  async getMetrics(orgId: string = DEFAULT_ORG_ID) {
    const summary = await this.getDashboardSummary(orgId);
    return {
      total: summary.totalIncidents,
      resolved: summary.resolvedIncidents,
      investigating: summary.investigatingIncidents,
      open: summary.activeIncidents - summary.investigatingIncidents,
      critical: summary.criticalIncidents,
      high: summary.severityCounts.high,
      medium: summary.severityCounts.medium,
      low: summary.severityCounts.low,
      memoryAssisted: summary.memoryAssistedInvestigations,
      avgMttrMinutes: summary.avgResolutionMinutes,
    };
  }

  // --- Dashboard, Analytics & Summary Metrics ---
  async getDashboardSummary(orgId: string = DEFAULT_ORG_ID) {
    const incidents = await this.getIncidents(orgId);
    const db = this.readDiskDB();
    const investigations = (db.investigations || []).filter((inv) => !orgId || inv.organization_id === orgId);
    const resolutions = (db.resolutions || []).filter((res) => !orgId || res.organization_id === orgId);

    const activeIncidents = incidents.filter((i) => i.status === 'triggered' || i.status === 'investigating').length;
    const criticalIncidents = incidents.filter((i) => i.severity === 'SEV-1').length;
    const investigatingIncidents = incidents.filter((i) => i.status === 'investigating').length;
    const resolvedIncidents = incidents.filter((i) => i.status === 'resolved').length;

    // Calculate real MTTR from resolved incidents
    const resolvedWithDates = incidents.filter((i) => i.status === 'resolved' && i.resolvedAt && i.triggeredAt);
    let avgResolutionMinutes = 38;
    if (resolvedWithDates.length > 0) {
      const totalMinutes = resolvedWithDates.reduce((acc, curr) => {
        const diff = (new Date(curr.resolvedAt!).getTime() - new Date(curr.triggeredAt).getTime()) / (1000 * 60);
        return acc + Math.max(1, Math.round(diff));
      }, 0);
      avgResolutionMinutes = Math.round(totalMinutes / resolvedWithDates.length);
    } else if (resolutions.length > 0) {
      const totalResMinutes = resolutions.reduce((acc, curr) => acc + (curr.resolution_time_minutes || 30), 0);
      avgResolutionMinutes = Math.round(totalResMinutes / resolutions.length);
    }

    const aiAssistedInvestigations = Math.max(
      investigations.length,
      incidents.filter((i) => i.status !== 'triggered').length
    );
    const memoryAssistedInvestigations = incidents.filter(
      (i) => i.memoryUsed || (i.memoryIds && i.memoryIds.length > 0)
    ).length;
    const successfulResolutions = Math.max(
      resolutions.filter((r) => r.outcome === 'successful').length,
      resolvedIncidents
    );

    // Calculate recurring patterns
    const serviceCounts: Record<string, number> = {};
    for (const inc of incidents) {
      serviceCounts[inc.service] = (serviceCounts[inc.service] || 0) + 1;
    }
    const recurringPatterns = Object.values(serviceCounts).filter((c) => c >= 2).length;

    const activeCritical = incidents.filter(
      (i) => (i.status === 'triggered' || i.status === 'investigating') && i.severity === 'SEV-1'
    ).length;
    const activeHigh = incidents.filter(
      (i) => (i.status === 'triggered' || i.status === 'investigating') && i.severity === 'SEV-2'
    ).length;

    const systemStatus = activeCritical > 0 ? 'Degraded' : activeHigh > 0 ? 'Warning' : 'Healthy';

    return {
      activeIncidents,
      criticalIncidents,
      investigatingIncidents,
      resolvedIncidents,
      totalIncidents: incidents.length,
      avgResolutionMinutes,
      aiAssistedInvestigations,
      memoryAssistedInvestigations,
      successfulResolutions,
      recurringPatterns,
      severityCounts: {
        critical: criticalIncidents,
        high: incidents.filter((i) => i.severity === 'SEV-2').length,
        medium: incidents.filter((i) => i.severity === 'SEV-3').length,
        low: incidents.filter((i) => i.severity === 'SEV-4').length,
      },
      systemHealth: {
        status: systemStatus,
        activeAlerts: activeCritical + activeHigh,
        uptimePercentage: activeCritical > 0 ? 99.1 : 99.85,
        servicesHealthy: Math.max(1, Object.keys(serviceCounts).length),
      },
    };
  }

  async getRecentIncidents(orgId: string = DEFAULT_ORG_ID, limit: number = 5): Promise<Incident[]> {
    const list = await this.getIncidents(orgId);
    return list.slice(0, limit);
  }

  async getRecentActivity(orgId: string = DEFAULT_ORG_ID, limit: number = 10): Promise<IncidentEvent[]> {
    const db = this.readDiskDB();
    const events = (db.incident_events || [])
      .filter((ev) => !orgId || ev.organization_id === orgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (events.length > 0) {
      return events.slice(0, limit);
    }

    // Default seeded events if none yet
    return [
      {
        id: randomUUID(),
        organization_id: orgId,
        incident_id: 'INC-1091',
        event_type: 'INVESTIGATION_STARTED',
        message: 'INC-1091 moved to Investigating with autonomous diagnostic agent.',
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: randomUUID(),
        organization_id: orgId,
        incident_id: 'INC-1090',
        event_type: 'MEMORY_RECALLED',
        message: 'Hindsight memory recalled historical mitigation for payment deadlocks.',
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
    ];
  }

  // --- Reports ---
  async getReports(orgId: string = DEFAULT_ORG_ID): Promise<DBReportRecord[]> {
    const db = this.readDiskDB();
    let reports = (db.reports || []).filter((r) => !orgId || r.organization_id === orgId);

    if (reports.length === 0) {
      // Seed initial high quality reports
      reports = [
        {
          id: 'REP-01',
          organization_id: orgId,
          title: 'Incident Postmortem Report - INC-1090',
          report_type: 'incident',
          summary: 'Detailed postmortem for Payment service error storm. Root cause: connection lock contention.',
          data: { incidentId: 'INC-1090', service: 'payment-service', durationMinutes: 45, outcome: 'successful' },
          created_by: DEFAULT_USER_ID,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'REP-02',
          organization_id: orgId,
          title: 'Weekly Reliability & Incident Summary',
          report_type: 'weekly_summary',
          summary: 'Weekly summary across checkout, payment, and user microservices. Overall SLA: 99.85%.',
          data: { period: 'Last 7 Days', totalIncidents: 6, resolved: 5, avgMttr: '38 minutes' },
          created_by: DEFAULT_USER_ID,
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'REP-03',
          organization_id: orgId,
          title: 'System Infrastructure Health & SLA Audit',
          report_type: 'system_health',
          summary: 'Infrastructure health evaluation, connection pool stress analysis, and resilience recommendations.',
          data: { status: 'Optimal', servicesAudited: 5, riskScore: 'Low' },
          created_by: DEFAULT_USER_ID,
          created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        },
      ];
      db.reports = reports;
      this.writeDiskDB(db);
    }

    return reports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getReportById(id: string, orgId: string = DEFAULT_ORG_ID): Promise<DBReportRecord | null> {
    const reports = await this.getReports(orgId);
    return reports.find((r) => r.id === id) || null;
  }

  async createReport(
    report: {
      title: string;
      report_type: DBReportRecord['report_type'];
      summary: string;
      data: Record<string, unknown>;
    },
    orgId: string = DEFAULT_ORG_ID,
    userId: string = DEFAULT_USER_ID
  ): Promise<DBReportRecord> {
    const id = `REP-${randomUUID().slice(0, 6).toUpperCase()}`;
    const newRecord: DBReportRecord = {
      id,
      organization_id: orgId,
      title: report.title,
      report_type: report.report_type,
      summary: report.summary,
      data: report.data,
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    const db = this.readDiskDB();
    db.reports = [newRecord, ...(db.reports || [])];
    this.writeDiskDB(db);
    return newRecord;
  }

  // --- Analytics Aggregation ---
  async getAnalyticsSummary(orgId: string = DEFAULT_ORG_ID) {
    const incidents = await this.getIncidents(orgId);
    const summary = await this.getDashboardSummary(orgId);

    const resolutionRate = incidents.length > 0
      ? Math.round((summary.resolvedIncidents / incidents.length) * 100)
      : 100;

    return {
      totalIncidents: incidents.length,
      meanTimeToDetect: '12m',
      meanTimeToResolve: `${summary.avgResolutionMinutes}m`,
      resolutionRate: `${resolutionRate}%`,
      aiAssistedInvestigations: summary.aiAssistedInvestigations,
      memoryAssistedInvestigations: summary.memoryAssistedInvestigations,
      recurringPatterns: summary.recurringPatterns,
      severityDistribution: summary.severityCounts,
    };
  }

  async getAnalyticsServices(orgId: string = DEFAULT_ORG_ID) {
    const incidents = await this.getIncidents(orgId);
    const counts: Record<string, { count: number; resolved: number; critical: number }> = {};

    for (const inc of incidents) {
      if (!counts[inc.service]) {
        counts[inc.service] = { count: 0, resolved: 0, critical: 0 };
      }
      counts[inc.service].count++;
      if (inc.status === 'resolved') counts[inc.service].resolved++;
      if (inc.severity === 'SEV-1') counts[inc.service].critical++;
    }

    return Object.entries(counts).map(([service, stat]) => ({
      service,
      total: stat.count,
      resolved: stat.resolved,
      critical: stat.critical,
      resolutionRate: Math.round((stat.resolved / stat.count) * 100),
    }));
  }

  async getAnalyticsResolutionTime(orgId: string = DEFAULT_ORG_ID) {
    const incidents = await this.getIncidents(orgId);
    const _resolved = incidents.filter((i) => i.status === 'resolved');

    return [
      { severity: 'SEV-1', avgMinutes: 28, count: incidents.filter((i) => i.severity === 'SEV-1').length },
      { severity: 'SEV-2', avgMinutes: 38, count: incidents.filter((i) => i.severity === 'SEV-2').length },
      { severity: 'SEV-3', avgMinutes: 45, count: incidents.filter((i) => i.severity === 'SEV-3').length },
      { severity: 'SEV-4', avgMinutes: 15, count: incidents.filter((i) => i.severity === 'SEV-4').length },
    ];
  }

  async getAnalyticsPatterns(orgId: string = DEFAULT_ORG_ID) {
    const incidents = await this.getIncidents(orgId);
    const patterns: Array<{ service: string; pattern: string; occurrences: number; preventedByMemory: boolean }> = [];

    const grouped: Record<string, Incident[]> = {};
    for (const inc of incidents) {
      grouped[inc.service] = grouped[inc.service] || [];
      grouped[inc.service].push(inc);
    }

    for (const [service, incs] of Object.entries(grouped)) {
      if (incs.length >= 2) {
        patterns.push({
          service,
          pattern: `Recurring latency and lock contention in ${service}`,
          occurrences: incs.length,
          preventedByMemory: incs.some((i) => i.memoryUsed),
        });
      }
    }

    return patterns;
  }

  // --- Helper Mapper ---
  private mapDbIncidentToIncident(row: DBIncidentRecord | Record<string, unknown>): Incident {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      incidentNumber: r.incident_number ? String(r.incident_number) : String(r.id).replace('INC-', ''),
      title: String(r.title),
      description: r.description ? String(r.description) : undefined,
      service: String(r.service),
      severity: r.severity as Severity,
      status: r.status as IncidentStatus,
      impact: r.impact ? String(r.impact) : undefined,
      triggeredAt: String(r.detected_at || r.created_at),
      resolvedAt: r.resolved_at ? String(r.resolved_at) : undefined,
      rootCause: r.root_cause ? String(r.root_cause) : undefined,
      symptoms: Array.isArray(r.symptoms) ? (r.symptoms as string[]) : [],
      logs: Array.isArray(r.logs) ? (r.logs as string[]) : [],
      memoryUsed: Boolean(r.memory_used),
      memoryIds: Array.isArray(r.memory_ids) ? (r.memory_ids as string[]) : [],
      tags: [String(r.service), String(r.severity).toLowerCase(), 'recall:incident'],
      createdBy: r.created_by ? String(r.created_by) : undefined,
      organizationId: r.organization_id ? String(r.organization_id) : undefined,
      createdAt: r.created_at ? String(r.created_at) : undefined,
      updatedAt: r.updated_at ? String(r.updated_at) : undefined,
    };
  }
}

// Firestore is the active repository. The legacy disk/Supabase implementation
// above remains only as a source-compatible migration reference and is never
// instantiated by application routes.
type DBGlobal = typeof globalThis & { recallFirestoreRepository?: FirestoreDatabaseRepository };
const dbGlobal = globalThis as DBGlobal;

export function getDatabase(): FirestoreDatabaseRepository {
  if (!dbGlobal.recallFirestoreRepository) {
    dbGlobal.recallFirestoreRepository = new FirestoreDatabaseRepository();
  }
  return dbGlobal.recallFirestoreRepository;
}

export const dbRepository: FirestoreDatabaseRepository = new Proxy({} as FirestoreDatabaseRepository, {
  get(_target, prop) {
    const instance = getDatabase() as unknown as Record<string | symbol, unknown>;
    const val = instance[prop];
    if (typeof val === 'function') {
      return val.bind(instance);
    }
    return val;
  },
});
