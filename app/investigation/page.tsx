import React from 'react';
import { dbRepository } from '@/lib/db';
import { InvestigationWorkspace } from '@/components/investigation/InvestigationWorkspace';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function InvestigationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await getSession();
  if (!session) redirect('/login');
  const orgId = session.user.organization_id;

  const allIncidents = await dbRepository.getIncidents(orgId);

  const initialIncident = id
    ? allIncidents.find((i) => i.id === id) || allIncidents[0]
    : allIncidents[0];

  return (
    <div className="h-full min-h-0 flex flex-col">
      <InvestigationWorkspace
        initialIncident={initialIncident}
        allIncidents={allIncidents}
      />
    </div>
  );
}
