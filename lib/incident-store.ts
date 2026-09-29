// ============================================================
// RECALL — In-Memory Incident Store (Server State)
// ============================================================

import { Incident, ResolutionForm } from './types';
import { demoIncidents } from './demo-data';
import { getMemoryProvider, buildMemoryEntry } from './memory-provider';

// Maintain a mutable list in memory for the server process lifetime
class IncidentStore {
  private incidents: Incident[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.incidents = JSON.parse(JSON.stringify(demoIncidents));
  }

  getAll(): Incident[] {
    return [...this.incidents];
  }

  getById(id: string): Incident | undefined {
    return this.incidents.find((inc) => inc.id === id);
  }

  add(incident: Incident): Incident {
    this.incidents.unshift(incident);
    return incident;
  }

  update(id: string, updates: Partial<Incident>): Incident | undefined {
    const idx = this.incidents.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    this.incidents[idx] = { ...this.incidents[idx], ...updates };
    return this.incidents[idx];
  }

  async resolve(id: string, form: ResolutionForm) {
    const inc = this.getById(id);
    if (!inc) throw new Error(`Incident ${id} not found`);

    const updated = this.update(id, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      rootCause: form.rootCause,
      resolution: form.actionTaken,
      resolutionOutcome: form.outcome,
      lessonsLearned: form.additionalLesson,
    });

    // Retain in Hindsight / Memory Provider
    const memEntry = buildMemoryEntry(updated!, form);
    const provider = getMemoryProvider();
    const retainResult = await provider.retain(memEntry);

    return { incident: updated, memory: memEntry, retainResult };
  }
}

// Singleton across HMR if possible
const globalForStore = global as unknown as { incidentStore?: IncidentStore };
export const incidentStore = globalForStore.incidentStore || new IncidentStore();
if (process.env.NODE_ENV !== 'production') globalForStore.incidentStore = incidentStore;
