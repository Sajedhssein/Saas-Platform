import { useEffect, useState } from 'react';
import { generatePath, useParams, useNavigate } from 'react-router-dom';
import { PageContainer, LoadingSpinner, DataFetchError } from '../../components/ui';
import { projectService } from '../../services/projectService';
import type { Project } from '../../types/project';

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'EM';
};

export const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const p = await projectService.getProject(id);
        if (!cancelled) setProject(p);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load project');
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
      <PageContainer title="Project" description="Project details">
        <div className="p-8"><LoadingSpinner /></div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Project" description="Project details">
        <DataFetchError message={error} onRetry={() => window.location.reload()} />
      </PageContainer>
    );
  }

  if (!project) {
    return (
      <PageContainer title="Project" description="Project details">
        <div className="p-8">Project not found.</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={project.name} description={project.description || 'Project details'}>
      <div className="bg-white rounded-lg border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
            <p className="text-sm text-slate-600">{project.description}</p>
            <div className="mt-4 text-sm text-slate-700">
              <div><strong>Status:</strong> {project.status}</div>
              <div><strong>Progress:</strong> {project.progress}%</div>
              <div><strong>Start:</strong> {project.startDate ?? '-'}</div>
              <div><strong>End:</strong> {project.endDate ?? '-'}</div>
              <div>
                <strong>Client:</strong>{' '}
                {project.client ? (
                  <button className="text-cyan-700 hover:underline" onClick={() => navigate(generatePath('/admin/clients/:id', { id: project.client!.id }))}>
                    {project.client.name}
                  </button>
                ) : (
                  <span>No client assigned</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Team Members</h4>
            <div className="mt-3 space-y-3">
              {(project.employees?.length ?? 0) === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  No team members assigned
                </div>
              ) : (
                project.employees.map((employee) => (
                  <div key={employee.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      {getInitials(employee.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{employee.name}</div>
                      <div className="truncate text-xs text-slate-500">{employee.email}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default ProjectDetails;
