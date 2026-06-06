import { useEffect, useMemo, useState } from 'react';
import { Input, Select, Textarea } from './Input';
import { Button } from './Button';
import { EmployeeSelector } from './EmployeeSelector';
import type { CreateProjectPayload, UpdateProjectPayload, Project, ProjectStatus } from '../../types/project';
import { clientService, type ClientRecord } from '../../services/clientService';

interface ProjectFormProps {
  initial?: Partial<Project>;
  onCancel: () => void;
  onSubmit: (data: CreateProjectPayload | UpdateProjectPayload) => Promise<void> | void;
  submitting?: boolean;
  error?: string | null;
}

export const ProjectForm = ({ initial = {}, onCancel, onSubmit, submitting = false, error }: ProjectFormProps) => {
  const [name, setName] = useState(initial.name ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [status, setStatus] = useState<string>(initial.status ?? 'pending');
  const [progress, setProgress] = useState<number>(initial.progress ?? 0);
  const [startDate, setStartDate] = useState<string>(initial.startDate ?? '');
  const [endDate, setEndDate] = useState<string>(initial.endDate ?? '');
  const [clientId, setClientId] = useState<string>(initial.client?.id ?? initial.clientId ?? '');
  const [employeeIds, setEmployeeIds] = useState<string[]>(
    initial.employees?.map((employee) => employee.id) ?? initial.teamMembers?.map((member) => member.id) ?? []
  );
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [clientSearch, setClientSearch] = useState<string>('');
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientOpen, setClientOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadClients = async () => {
      try {
        setClientLoading(true);
        setClientError(null);
        const response = await clientService.getClients();
        if (!cancelled) {
          setClients(response);
        }
      } catch (loadError) {
        if (!cancelled) {
          setClientError(loadError instanceof Error ? loadError.message : 'Failed to load clients');
        }
      } finally {
        if (!cancelled) {
          setClientLoading(false);
        }
      }
    };

    void loadClients();

    return () => {
      cancelled = true;
    };
  }, []);

  // Prefill handled by initial state and controlled updates via props; avoid synchronous setState in effect

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();

    if (!query) {
      return clients;
    }

    return clients.filter((client) =>
      [client.name, client.company, client.email]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [clientSearch, clients]);

  const selectedClient = clients.find((client) => client.id === clientId) ?? null;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return alert('Name is required');

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      status: status as ProjectStatus,
      progress,
      startDate: startDate || null,
      endDate: endDate || null,
      clientId: clientId || null,
      employee_ids: employeeIds,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-slate-700">Project Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-700">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-700">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </Select>
          <label className="text-xs font-medium text-slate-700">Progress (%)</label>
          <Input type="number" value={progress} onChange={(e) => setProgress(Number(e.target.value))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-700">Start Date</label>
          <Input type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700">End Date</label>
          <Input type="date" value={endDate ?? ''} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="relative">
        <label className="mb-1 block text-xs font-medium text-slate-700">Select Client</label>
        <button
          type="button"
          onClick={() => setClientOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
          disabled={submitting || clientLoading}
        >
          <span className={selectedClient ? 'text-slate-900' : 'text-slate-500'}>
            {selectedClient ? selectedClient.name : 'No Client'}
          </span>
          <span className="text-xs text-slate-500">{clientLoading ? 'Loading...' : 'Search'}</span>
        </button>

        {clientOpen && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-3">
              <Input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search clients"
                disabled={clientLoading || submitting}
              />
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              <button
                type="button"
                onClick={() => {
                  setClientId('');
                  setClientOpen(false);
                }}
                className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${!clientId ? 'bg-cyan-50 text-cyan-900' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <span>No Client</span>
                {!clientId && <span className="text-xs font-semibold">Selected</span>}
              </button>

              {clientError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{clientError}</div>
              ) : filteredClients.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-500">No clients found</div>
              ) : (
                filteredClients.map((client) => {
                  const active = client.id === clientId;

                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setClientId(client.id);
                        setClientOpen(false);
                      }}
                      className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${active ? 'bg-cyan-50 text-cyan-900' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <span>
                        <span className="block font-medium">{client.name}</span>
                        <span className="block text-xs text-slate-500">{client.company}</span>
                      </span>
                      {active && <span className="text-xs font-semibold">Selected</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <EmployeeSelector value={employeeIds} onChange={setEmployeeIds} disabled={submitting} />

      <div className="flex items-center gap-3 justify-end">
        <Button variant="secondary" onClick={onCancel} type="button">Cancel</Button>
        <Button variant="primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
      </div>
    </form>
  );
};
