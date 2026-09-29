import fs from 'fs';
import path from 'path';
import { DEFAULT_ORG_ID, DEFAULT_USER_ID } from './db';

const DB_PATH = path.resolve(process.cwd(), '.recall_db', 'database.json');

export function ensureAnalyticsData() {
  try {
    if (!fs.existsSync(DB_PATH)) return;
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(raw);

    // If already has >= 50 incidents, don't reseed
    if (db.incidents && db.incidents.length >= 50) {
      return;
    }

    const services = [
      { name: 'payment-service', count: 32, resolved: 22, mttd: 11, mttr: 34, sev1: 3, sev2: 10, sev3: 13, sev4: 6 },
      { name: 'user-service', count: 25, resolved: 21, mttd: 9, mttr: 21, sev1: 1, sev2: 6, sev3: 12, sev4: 6 },
      { name: 'checkout-service', count: 18, resolved: 11, mttd: 14, mttr: 32, sev1: 2, sev2: 5, sev3: 7, sev4: 4 },
      { name: 'upload-service', count: 14, resolved: 12, mttd: 8, mttr: 18, sev1: 0, sev2: 3, sev3: 6, sev4: 5 },
      { name: 'auth-service', count: 13, resolved: 10, mttd: 10, mttr: 24, sev1: 1, sev2: 4, sev3: 5, sev4: 3 },
      { name: 'inventory-service', count: 11, resolved: 7, mttd: 13, mttr: 29, sev1: 1, sev2: 2, sev3: 5, sev4: 3 },
      { name: 'notification-service', count: 11, resolved: 6, mttd: 7, mttr: 15, sev1: 0, sev2: 2, sev3: 6, sev4: 3 },
    ];

    const failurePatterns = [
      {
        name: 'Database Connection Timeout',
        services: ['payment-service', 'checkout-service', 'user-service', 'inventory-service'],
        symptoms: ['Database connection pool exhausted', 'Acquisition timeout > 5000ms', 'Slow query queue saturation'],
        rootCause: 'Database connection pool starvation caused by unindexed analytical queries locking rows.',
        mttrBase: 42,
      },
      {
        name: 'API Gateway Timeout',
        services: ['payment-service', 'auth-service', 'user-service'],
        symptoms: ['HTTP 504 Gateway Timeout', 'Upstream latency spike p99 > 3200ms', 'Circuit breaker tripped open'],
        rootCause: 'Upstream gateway buffer saturation and thread exhaustion under high concurrent request volume.',
        mttrBase: 36,
      },
      {
        name: 'Memory Exhaustion',
        services: ['upload-service', 'checkout-service'],
        symptoms: ['OOM killer invoked on container', 'JVM GC pause > 4000ms', 'Heap usage exceeded 94%'],
        rootCause: 'Unbounded in-memory file buffering during multipart upload processing.',
        mttrBase: 28,
      },
      {
        name: 'Cache Invalidation Storm',
        services: ['user-service', 'notification-service'],
        symptoms: ['Redis cache miss surge', 'Direct DB read latency doubled', 'Hot key stampede on user profile'],
        rootCause: 'Synchronous TTL expiry on high-traffic cache entries causing simultaneous database reads.',
        mttrBase: 22,
      },
    ];

    const newIncidents: any[] = [];
    const newInvestigations: any[] = [];
    const newResolutions: any[] = [];
    const now = new Date();

    let incIdCounter = 1001;

    services.forEach((svc) => {
      let resolvedRemaining = svc.resolved;
      let sev1Remaining = svc.sev1;
      let sev2Remaining = svc.sev2;
      let sev3Remaining = svc.sev3;

      for (let i = 0; i < svc.count; i++) {
        const id = `INC-${incIdCounter++}`;
        const isResolved = resolvedRemaining > 0 && (i % 2 === 0 || i >= svc.count - svc.resolved);
        if (isResolved) resolvedRemaining--;

        let severity = 'SEV-4';
        if (sev1Remaining > 0) { severity = 'SEV-1'; sev1Remaining--; }
        else if (sev2Remaining > 0) { severity = 'SEV-2'; sev2Remaining--; }
        else if (sev3Remaining > 0) { severity = 'SEV-3'; sev3Remaining--; }

        // Distribute timestamp over past 30 days
        const daysAgo = Math.floor(Math.random() * 28);
        const hoursAgo = Math.floor(Math.random() * 24);
        const minutesAgo = Math.floor(Math.random() * 60);
        const createdDate = new Date(now.getTime() - (daysAgo * 86400000 + hoursAgo * 3600000 + minutesAgo * 60000));
        
        // MTTD: detected 5 to 18 minutes after creation
        const mttdMinutes = Math.floor(Math.max(5, Math.min(20, svc.mttd + (Math.random() * 8 - 4))));
        const detectedDate = new Date(createdDate.getTime() + mttdMinutes * 60000);

        // MTTR: resolved duration
        let mttrMinutes = 20;
        if (severity === 'SEV-1') mttrMinutes = Math.floor(40 + Math.random() * 16);
        else if (severity === 'SEV-2') mttrMinutes = Math.floor(30 + Math.random() * 12);
        else if (severity === 'SEV-3') mttrMinutes = Math.floor(20 + Math.random() * 10);
        else mttrMinutes = Math.floor(10 + Math.random() * 8);

        const resolvedDate = isResolved ? new Date(detectedDate.getTime() + mttrMinutes * 60000) : undefined;
        const pattern = failurePatterns[i % failurePatterns.length];

        const memoryUsed = i % 3 !== 0; // ~67% memory assisted

        const incidentRecord = {
          id,
          organization_id: DEFAULT_ORG_ID,
          incident_number: String(incIdCounter - 1),
          title: `${pattern.name} in ${svc.name}`,
          description: `Automated telemetry detected anomaly matching ${pattern.name.toLowerCase()} signature on ${svc.name}.`,
          service: svc.name,
          severity,
          status: isResolved ? 'resolved' : (i % 3 === 0 ? 'triggered' : 'investigating'),
          detected_at: detectedDate.toISOString(),
          resolved_at: resolvedDate ? resolvedDate.toISOString() : undefined,
          root_cause: isResolved ? pattern.rootCause : undefined,
          impact: severity === 'SEV-1' ? 'Critical customer checkout failure' : 'Intermittent latency degradation',
          created_by: DEFAULT_USER_ID,
          memory_used: memoryUsed,
          memory_ids: memoryUsed ? [`mem-${id.toLowerCase()}`] : [],
          symptoms: pattern.symptoms,
          logs: [
            `[${severity}] ${svc.name}: Telemetry threshold violated`,
            `[WARN] ${svc.name}: ${pattern.symptoms[0]}`,
          ],
          created_at: createdDate.toISOString(),
          updated_at: (resolvedDate || detectedDate).toISOString(),
        };

        newIncidents.push(incidentRecord);

        // Add investigation
        if (newInvestigations.length < 104) {
          newInvestigations.push({
            id: `inv-${id}`,
            organization_id: DEFAULT_ORG_ID,
            incident_id: id,
            status: isResolved ? 'completed' : 'in_progress',
            summary: `Automated investigation correlated telemetry for ${svc.name}.`,
            likely_root_cause: pattern.rootCause,
            confidence: 0.92,
            started_at: detectedDate.toISOString(),
            completed_at: isResolved && resolvedDate ? resolvedDate.toISOString() : detectedDate.toISOString(),
            created_at: detectedDate.toISOString(),
          });
        }

        // Add resolution
        if (isResolved && newResolutions.length < 42) {
          newResolutions.push({
            id: `res-${id}`,
            organization_id: DEFAULT_ORG_ID,
            incident_id: id,
            root_cause: pattern.rootCause,
            actions_taken: 'Scaled connection pool; purged bad query cache; applied rate limiter.',
            outcome: 'successful',
            resolution_time_minutes: mttrMinutes,
            lessons_learned: 'Enforce aggressive query timeouts and pool headroom monitoring.',
            verified: true,
            hindsight_memory_id: `mem-${id}`,
            created_at: resolvedDate ? resolvedDate.toISOString() : detectedDate.toISOString(),
          });
        }
      }
    });

    // Merge with existing
    const existingIds = new Set((db.incidents || []).map((i: any) => i.id));
    const mergedIncidents = [
      ...(db.incidents || []),
      ...newIncidents.filter((i) => !existingIds.has(i.id)),
    ];

    db.incidents = mergedIncidents;
    db.investigations = [
      ...(db.investigations || []),
      ...newInvestigations,
    ];
    db.resolutions = [
      ...(db.resolutions || []),
      ...newResolutions,
    ];

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    console.log(`[Seed] Seeded ${mergedIncidents.length} incidents to .recall_db/database.json`);
  } catch (err) {
    console.error('Failed to seed analytics dataset:', err);
  }
}
