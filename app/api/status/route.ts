import { getMemoryProvider } from '@/lib/memory-provider';
import { dbRepository } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
  const provider = getMemoryProvider();
  const memoryHealth = await provider.health();
  const incidents = await dbRepository.getIncidents(session.user.organization_id);

  let hindsightState: 'CONNECTED' | 'NOT CONFIGURED' | 'UNAVAILABLE' | 'FALLBACK' = 'NOT CONFIGURED';
  if (!memoryHealth.configured) {
    hindsightState = 'NOT CONFIGURED';
  } else if (memoryHealth.connected) {
    hindsightState = 'CONNECTED';
  } else if (memoryHealth.mode === 'demo') {
    hindsightState = 'FALLBACK';
  } else {
    hindsightState = 'UNAVAILABLE';
  }

  const databaseState = {
    status: 'CONNECTED',
    engine: 'Cloud Firestore',
    totalIncidents: incidents.length,
    activeConnection: true,
  };

  const aiProviderState = {
    status: memoryHealth.connected ? 'CONNECTED' : 'FALLBACK',
    provider: memoryHealth.connected
      ? 'Hindsight Reflect (live structured incident reasoning)'
      : 'Deterministic diagnostic fallback (rule-based SRE engine)',
    isConfigured: memoryHealth.connected,
  };

  return Response.json({
    status: 'healthy',
    hindsight: {
      state: hindsightState,
      connected: memoryHealth.connected,
      mode: memoryHealth.mode,
      details: memoryHealth.details,
      isConfigured: memoryHealth.configured,
      persistent: memoryHealth.persistent,
      bankId: process.env.HINDSIGHT_BANK_ID || 'not configured',
      baseUrl: process.env.HINDSIGHT_BASE_URL || 'not configured',
    },
    aiProvider: aiProviderState,
    database: databaseState,
    memoryProvider: {
      mode: memoryHealth.mode,
      engine: memoryHealth.connected ? 'Hindsight Cloud API' : 'Local Disk Demo Memory',
      persistent: memoryHealth.persistent,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      platform: 'Recall AI Incident Intelligence v1.0',
      demoMode: !memoryHealth.connected,
    },
  });
}
