import { useEffect, useState } from 'react';
import { generatePath, useParams, useNavigate } from 'react-router-dom';
import { PageContainer, LoadingSpinner, DataFetchError, EmptyState } from '../../components/ui';
import { clientService } from '../../services/clientService';
import type { ClientRecord } from '../../services/clientService';
import type { Project } from '../../types/project';

export const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const c = await clientService.getClient(id);
        if (!cancelled) setClient(c);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load client');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <PageContainer title="Client" description="Client details and projects">
        <div className="p-8"><LoadingSpinner /></div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Client" description="Client details and projects">
        <DataFetchError message={error} onRetry={() => window.location.reload()} />
      </PageContainer>
    );
  }

  if (!client) {
    return (
      <PageContainer title="Client" description="Client details and projects">
        <EmptyState title="Client not found" message="The requested client could not be located." />
      </PageContainer>
    );
  }

  const projects: Project[] = client.latest_projects ?? [];

  return (
    <PageContainer title={client.name} description={`Projects for ${client.name}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-4">
            <img src={client.avatar} alt={client.name} className="w-16 h-16 rounded-full" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{client.name}</h2>
              <p className="text-sm text-slate-500">{client.company}</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-600">
            <div><strong>Active Projects:</strong> {client.projects_count ?? client.projects ?? 0}</div>
            <div className="mt-2"><strong>Email:</strong> {client.email}</div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Projects</h3>
          {projects.length === 0 ? (
            <EmptyState title="No projects assigned" message="This client has no recent projects." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.slice(0, 5).map((p) => (
                <div key={p.id} className="rounded-lg border p-4 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate(generatePath('/admin/projects/:id', { id: p.id }))}>
                  <h4 className="font-medium text-slate-900">{p.name}</h4>
                  <p className="text-xs text-slate-500">{p.progress}% progress</p>
                  <p className="text-xs text-slate-500 mt-2">{p.teamMembers?.length ?? 0} members</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientDetails;
