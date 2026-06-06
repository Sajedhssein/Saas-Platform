import { useEffect, useMemo, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { DashboardCard, DataFetchError, EmptyState, LoadingSpinner, PageContainer, ProgressBar, StatusBadge } from '../../components/ui';
import { clientProjectService } from '../../services';
import type { Project } from '../../types/project';

export const ClientProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await clientProjectService.getProjects({ per_page: 8 });

        if (!cancelled) {
          setProjects(response.data ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load projects');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(
    () => [
      { title: 'Projects', value: projects.length, icon: <FolderOpen size={22} /> },
      { title: 'Active', value: projects.filter((project) => project.status !== 'completed').length, icon: <FolderOpen size={22} /> },
      { title: 'Completed', value: projects.filter((project) => project.status === 'completed').length, icon: <FolderOpen size={22} /> },
    ],
    [projects]
  );

  if (loading) {
    return (
      <PageContainer title="Projects" description="View your active projects">
        <div className="p-8">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Projects" description="View your active projects">
        <DataFetchError message={error} onRetry={() => window.location.reload()} />
      </PageContainer>
    );
  }

  if (projects.length === 0) {
    return (
      <PageContainer title="Projects" description="View your active projects">
        <EmptyState title="No projects yet" message="Projects shared with your account will appear here." />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Projects" description="View your active projects">
      <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-slate-50 via-white to-cyan-50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] mb-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Project overview</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Monitor progress and status across your client-facing projects.</p>
          </div>
          <div className="inline-flex items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
              <FolderOpen size={14} className="text-cyan-600" />
              {projects.length} projects
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {stats.map((card) => (
          <DashboardCard key={card.title} title={card.title} value={card.value} icon={card.icon} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{project.description || 'No project description provided.'}</p>
              </div>
              <StatusBadge status={project.status} />
            </div>
            <ProgressBar value={project.progress} />
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>{project.client?.name ?? 'No client assigned'}</span>
              <span>{project.progress}%</span>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500">
                {project.startDate ? `Started: ${new Date(project.startDate).toLocaleDateString()}` : 'Start date pending'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
};
