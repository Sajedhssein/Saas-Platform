import { useEffect, useMemo, useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import { Button, PageContainer, ProjectCard, Modal, ProjectForm, LoadingSpinner, EmptyState, DataFetchError } from '../../components/ui';
import { Plus, Search } from 'lucide-react';
import { projectService } from '../../services/projectService';
import { clientService, type ClientRecord } from '../../services/clientService';
import { TASK_MUTATION_EVENT, taskService } from '../../services/taskService';
import type { Project, CreateProjectPayload, UpdateProjectPayload } from '../../types/project';
import type { Task } from '../../types/task';

const calculateProjectProgress = (tasks: Task[], projectId: string): number => {
  const projectTasks = tasks.filter((task) => task.project_id === projectId);

  if (projectTasks.length === 0) {
    return 0;
  }

  const completedTasks = projectTasks.filter((task) => task.status === 'completed').length;

  return Math.round((completedTasks / projectTasks.length) * 100);
};

export const AdminProjects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [clientFilter, setClientFilter] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const params: { page?: number; per_page?: number; search?: string; status?: string; client_id?: string } = {
          page,
          per_page: 9,
        };

        if (search) params.search = search;
        if (statusFilter) params.status = statusFilter;
        if (clientFilter) params.client_id = clientFilter;

        const resp = await projectService.getProjects(params);
        if (cancelled) return;
        setProjects(resp.data);
        setMeta(resp.meta);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load projects';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, search, reloadKey, clientFilter]);

  useEffect(() => {
    let cancelled = false;
    const loadClients = async () => {
      try {
        const all = await clientService.getClients();
        if (!cancelled) setClients(all);
      } catch {
        if (!cancelled) setClients([]);
      }
    };

    void loadClients();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTasks = async () => {
      try {
        const allTasks: Task[] = [];
        let nextPage = 1;
        let lastPage = 1;

        do {
          const response = await taskService.getTasks({ page: nextPage, per_page: 100 });
          allTasks.push(...response.data);
          lastPage = response.meta?.last_page ?? nextPage;
          nextPage += 1;
        } while (nextPage <= lastPage);

        if (!cancelled) {
          setTasks(allTasks);
        }
      } catch {
        if (!cancelled) {
          setTasks([]);
        }
      }
    };

    void loadTasks();

    const handleTaskMutation = () => {
      void loadTasks();
    };

    window.addEventListener(TASK_MUTATION_EVENT, handleTaskMutation);

    return () => {
      cancelled = true;
      window.removeEventListener(TASK_MUTATION_EVENT, handleTaskMutation);
    };
  }, []);

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedId) return;
      try {
        setDetailLoading(true);
        const p = await projectService.getProject(selectedId);
        setSelectedProject(p);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to load project');
        setSelectedId(null);
      } finally {
        setDetailLoading(false);
      }
    };

    void loadDetail();
  }, [selectedId]);

  const projectsWithProgress = useMemo(
    () =>
      projects.map((project) => ({
        ...project,
        progress: calculateProjectProgress(tasks, project.id),
      })),
    [projects, tasks]
  );

  const selectedProjectWithProgress = useMemo(() => {
    if (!selectedProject) {
      return null;
    }

    return {
      ...selectedProject,
      progress: calculateProjectProgress(tasks, selectedProject.id),
    };
  }, [selectedProject, tasks]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    setReloadKey((k) => k + 1);
  };

  const handleCreate = async (data: CreateProjectPayload) => {
    try {
      setCreateError(null);
      setSubmitting(true);
      const created = await projectService.createProject(data);
      // optimistic insert
      setProjects((prev) => [created, ...prev]);
      setOpenNew(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create project.';
      setCreateError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Projects" description="Manage all projects in your organization">
        <div className="p-8"><LoadingSpinner /></div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Projects" description="Manage all projects in your organization">
        <DataFetchError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Projects"
      description="Manage all projects in your organization"
      action={
        <Button variant="primary" size="lg" className="gap-2" onClick={() => setOpenNew(true)}>
          <Plus size={20} />
          New Project
        </Button>
      }
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-1/2">
          <div className="relative flex-1">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects" className="w-full border rounded-md p-2 pl-9" />
            <div className="absolute left-3 top-2 text-slate-400"><Search size={16} /></div>
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="flex items-center gap-2">
            <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="border rounded-md p-2 text-sm">
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-md p-2 text-sm">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
          </select>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects" message="No projects found. Create a new project to get started." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsWithProgress.map((project) => (
            <ProjectCard key={project.id} project={project} onClick={() => setSelectedId(project.id)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
          <div className="px-4 py-2 bg-slate-100 rounded">Page {meta.current_page} / {meta.last_page}</div>
          <Button onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page >= meta.last_page}>Next</Button>
        </div>
      )}

      <Modal
        open={openNew}
        onClose={() => {
          setOpenNew(false);
          setCreateError(null);
        }}
        title="Create Project"
        titleClassName="text-black"
      >
        <ProjectForm
          key="new"
          initial={undefined}
          onCancel={() => {
            setOpenNew(false);
            setCreateError(null);
          }}
          onSubmit={(d) => handleCreate(d as CreateProjectPayload)}
          submitting={submitting}
          error={createError}
        />
      </Modal>

      {/* Details / Edit / Delete modal */}
      <Modal open={!!selectedId && !!selectedProject} onClose={() => { setSelectedId(null); setSelectedProject(null); setEditOpen(false); }} title={selectedProjectWithProgress ? selectedProjectWithProgress.name : 'Project'}>
        {detailLoading && <div className="p-8"><LoadingSpinner /></div>}
        {selectedProjectWithProgress && (
              <div className="space-y-4">
            <div className="text-sm text-slate-700">{selectedProjectWithProgress.description}</div>
            <div className="grid grid-cols-2 gap-4">
              <div><strong>Status:</strong> {selectedProjectWithProgress.status}</div>
              <div><strong>Progress:</strong> {selectedProjectWithProgress.progress}%</div>
              <div><strong>Start:</strong> {selectedProjectWithProgress.startDate ?? '-'}</div>
              <div><strong>End:</strong> {selectedProjectWithProgress.endDate ?? '-'}</div>
              <div>
                <strong>Client:</strong>{' '}
                {selectedProjectWithProgress.client ? (
                  <button className="text-cyan-700 hover:underline" onClick={() => navigate(generatePath('/admin/clients/:id', { id: selectedProjectWithProgress.client!.id }))}>
                    {selectedProjectWithProgress.client.name}
                  </button>
                ) : (
                  <span>No client assigned</span>
                )}
              </div>
              <div><strong>Created By:</strong> {selectedProjectWithProgress.createdBy?.name ?? '-'}</div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setEditOpen(true); }} >Edit</Button>
              <Button variant="danger" isLoading={deleteLoading} onClick={async () => {
                if (!selectedProjectWithProgress) return;
                // confirm
                if (!window.confirm('Delete this project?')) return;
                try {
                  setDeleteLoading(true);
                  await projectService.deleteProject(selectedProjectWithProgress.id);
                  setProjects((prev) => prev.filter((p) => p.id !== selectedProjectWithProgress.id));
                  setSelectedId(null);
                  setSelectedProject(null);
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Delete failed');
                } finally {
                  setDeleteLoading(false);
                }
              }}>Delete</Button>
            </div>

            {/* Edit Form */}
            {editOpen && (
              <div className="pt-4 border-t">
                <ProjectForm key={selectedProjectWithProgress?.id ?? 'edit'} initial={selectedProjectWithProgress ?? undefined} onCancel={() => setEditOpen(false)} onSubmit={async (payload: CreateProjectPayload | UpdateProjectPayload) => {
                  if (!selectedProjectWithProgress) return;
                  try {
                    setSubmitting(true);
                    const updated = await projectService.updateProject(selectedProjectWithProgress.id, payload as UpdateProjectPayload);
                    setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p));
                    setSelectedProject(updated);
                    setEditOpen(false);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Update failed');
                  } finally {
                    setSubmitting(false);
                  }
                }} submitting={submitting} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};
