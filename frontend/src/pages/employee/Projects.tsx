import { useEffect, useState } from 'react';
import { FolderOpen, CalendarDays, CircleAlert } from 'lucide-react';
import { DataFetchError, DashboardCard, EmptyState, LoadingSpinner, PageContainer, ProgressBar, StatusBadge } from '../../components/ui';
import { employeeService } from '../../services/employeeService';
import type { Project } from '../../types/project';

export const EmployeeProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await employeeService.getEmployeeProjects();

        if (!cancelled) {
          setProjects(response);
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
  }, [refreshKey]);

  const activeProjects = projects.filter((project) => project.status !== 'completed');
  const completedProjects = projects.filter((project) => project.status === 'completed');

  return (
    <PageContainer title="My Projects" description="Track the projects assigned to you">
      {loading ? (
        <div className="p-8">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <DataFetchError message={error} onRetry={() => setRefreshKey((value) => value + 1)} />
      ) : projects.length === 0 ? (
        <EmptyState title="No assigned projects" message="When projects are assigned to you, they will appear here." />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <DashboardCard title="My Projects" value={projects.length} icon={<FolderOpen size={22} />} />
            <DashboardCard title="Active" value={activeProjects.length} icon={<CircleAlert size={22} />} />
            <DashboardCard title="Completed" value={completedProjects.length} icon={<CalendarDays size={22} />} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {projects.map((project) => (
              <div key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
                  </div>
                  <StatusBadge status={project.status} />
                </div>

                <div className="mt-4 space-y-3">
                  <ProgressBar value={project.progress} />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{project.client?.name ?? 'No client assigned'}</span>
                    <span>{project.progress}%</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                    <p className="font-medium text-slate-900 capitalize">{project.status.replace('-', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Due Date</p>
                    <p className="font-medium text-slate-900">
                      {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No due date set'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default EmployeeProjects;
