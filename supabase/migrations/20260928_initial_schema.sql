-- ============================================================
-- RECALL — Production PostgreSQL Schema & Row Level Security
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles (Linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'sre_engineer',
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Managed Services
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'healthy',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Incidents (Application Source of Truth)
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    incident_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    service TEXT NOT NULL,
    severity TEXT NOT NULL, -- SEV-1, SEV-2, SEV-3, SEV-4
    status TEXT NOT NULL DEFAULT 'triggered', -- triggered, investigating, identified, resolved, postmortem
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    root_cause TEXT,
    impact TEXT,
    created_by TEXT NOT NULL DEFAULT 'system',
    memory_used BOOLEAN NOT NULL DEFAULT FALSE,
    memory_ids TEXT[] DEFAULT '{}',
    symptoms TEXT[] DEFAULT '{}',
    logs TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Incident Events (Audit Trail & Timeline)
CREATE TABLE IF NOT EXISTS incident_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- INCIDENT_CREATED, AI_INVESTIGATION_STARTED, MEMORY_RECALLED, etc.
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Investigations
CREATE TABLE IF NOT EXISTS investigations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'completed',
    summary TEXT NOT NULL,
    likely_root_cause TEXT NOT NULL,
    confidence NUMERIC NOT NULL DEFAULT 0.95,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Investigation Findings
CREATE TABLE IF NOT EXISTS investigation_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    finding_type TEXT NOT NULL,
    finding TEXT NOT NULL,
    evidence TEXT,
    source TEXT NOT NULL DEFAULT 'hindsight',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Resolutions (Learning Hook: Resolution -> Hindsight Retain)
CREATE TABLE IF NOT EXISTS resolutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    root_cause TEXT NOT NULL,
    actions_taken TEXT NOT NULL,
    outcome TEXT NOT NULL DEFAULT 'successful',
    resolution_time_minutes INT NOT NULL DEFAULT 35,
    lessons_learned TEXT,
    verified BOOLEAN NOT NULL DEFAULT TRUE,
    hindsight_memory_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'alert',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Organization Data Isolation Policies
CREATE POLICY org_isolation_incidents ON incidents
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY org_isolation_incident_events ON incident_events
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY org_isolation_investigations ON investigations
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY org_isolation_resolutions ON resolutions
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);
