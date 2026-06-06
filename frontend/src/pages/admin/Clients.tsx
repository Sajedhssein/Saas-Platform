import { useEffect, useMemo, useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import { Mail, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  Button,
  DataFetchError,
  EmptyState,
  Input,
  LoadingSpinner,
  Modal,
  PageContainer,
  SearchBar,
  StatusBadge,
} from '../../components/ui';
import type { Client } from '../../types';
import {
  clientService,
  type ClientRecord,
  type CreateClientPayload,
  type UpdateClientPayload,
} from '../../services/clientService';

interface ClientFormState {
  name: string;
  email: string;
  phone: string;
  company: string;
  avatar: string;
  projects: string;
  status: Client['status'];
}

const defaultAvatar = (name: string): string =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'Client')}`;

const emptyFormState: ClientFormState = {
  name: '',
  email: '',
  phone: '',
  company: '',
  avatar: '',
  projects: '0',
  status: 'active',
};

const normalizeClient = (client: ClientRecord): Client => ({
  id: client.id,
  name: client.name || 'Unnamed Client',
  email: client.email || '',
  company: client.company || 'Independent',
  avatar: client.avatar || defaultAvatar(client.name || 'Client'),
  projects: Number(client.projects ?? 0),
  status: client.status || 'active',
});

export const AdminClients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<ClientFormState>(emptyFormState);

  const loadClients = async () => {
    try {
      const response = await clientService.getClients();
      setClients(response.map(normalizeClient));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClients();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    void loadClients();
  };

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return clients;
    }

    return clients.filter((client) => {
      return [client.name, client.email, client.company, client.status, String(client.projects)]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [clients, search]);

  const stats = useMemo(() => {
    const totalClients = clients.length;
    const activeClients = clients.filter((client) => client.status === 'active').length;
    const inactiveClients = clients.filter((client) => client.status === 'inactive').length;
    const totalProjects = clients.reduce((total, client) => total + client.projects, 0);

    return [
      { label: 'Total Clients', value: totalClients.toString(), color: 'bg-blue-50' },
      { label: 'Active Clients', value: activeClients.toString(), color: 'bg-green-50' },
      { label: 'Inactive Clients', value: inactiveClients.toString(), color: 'bg-slate-50' },
      { label: 'Active Projects', value: totalProjects.toString(), color: 'bg-orange-50' },
    ];
  }, [clients]);

  const openCreateModal = () => {
    navigate('/admin/invites?role=client');
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone ?? '',
      company: client.company,
      avatar: client.avatar,
      projects: String(client.projects),
      status: client.status,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSubmitting || isDeleting) {
      return;
    }

    setFormOpen(false);
    setSelectedClient(null);
    setFormData(emptyFormState);
  };

  const handleChange = (field: keyof ClientFormState, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const createPayload: CreateClientPayload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      company: formData.company.trim(),
      avatar: formData.avatar.trim() || defaultAvatar(formData.name.trim()),
      projects: Number(formData.projects) || 0,
      status: formData.status,
    };

    const updatePayload: UpdateClientPayload = { ...createPayload };

    setIsSubmitting(true);

    try {
      if (selectedClient) {
        await clientService.updateClient(selectedClient.id, updatePayload);
        toast.success('Client updated');
      } else {
        await clientService.createClient(createPayload);
        toast.success('Client created');
      }

      setFormOpen(false);
      setSelectedClient(null);
      setFormData(emptyFormState);
      await loadClients();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Failed to save client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (client: Client) => {
    setFormOpen(false);
    setDeleteTarget(client);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);

    try {
      await clientService.deleteClient(deleteTarget.id);
      toast.success('Client deleted');
      setDeleteTarget(null);
      await loadClients();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete client');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Clients" description="Manage client relationships and projects">
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Clients" description="Manage client relationships and projects">
        <DataFetchError message={error} onRetry={handleRetry} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Clients"
      description="Manage client relationships and projects"
      action={
        <Button variant="primary" size="lg" className="gap-2" onClick={openCreateModal}>
          <Plus size={20} />
          New Client
        </Button>
      }
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-lg p-4 border border-slate-200`}>
              <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBar
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clients by name, company, email, or status"
            className="w-full sm:max-w-xl"
          />
          <p className="text-sm text-slate-500">Use the edit and delete actions on each client card or row.</p>
        </div>

        {filteredClients.length === 0 ? (
          <EmptyState
            title="No clients found"
            message={search.trim() ? 'Try a different search term.' : 'Create your first client to get started.'}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={client.avatar} alt={client.name} className="w-12 h-12 rounded-full shrink-0" />
                      <button
                        type="button"
                        onClick={() => navigate(generatePath('/admin/clients/:id', { id: client.id }))}
                        className="min-w-0 text-left"
                      >
                        <h3 className="text-lg font-semibold text-slate-900 truncate hover:text-cyan-700">{client.name}</h3>
                        <p className="text-sm text-slate-600 truncate">{client.company}</p>
                      </button>
                    </div>
                    <StatusBadge status={client.status} />
                  </div>

                  <div className="space-y-3 mb-4 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail size={16} />
                      <span className="truncate">{client.email}</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-slate-900">{client.projects}</span>{' '}
                      Active Project{client.projects !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => openEditModal(client)}>
                      Edit
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={() => handleDeleteClick(client)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">All Clients</h3>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Client</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Email</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Company</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Projects</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredClients.map((client) => (
                        <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={client.avatar} alt={client.name} className="w-10 h-10 rounded-full" />
                              <button
                                type="button"
                                className="text-sm font-medium text-slate-900 hover:text-cyan-700"
                                onClick={() => navigate(generatePath('/admin/clients/:id', { id: client.id }))}
                              >
                                {client.name}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{client.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-900">{client.company}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{client.projects}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={client.status} />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditModal(client)}>
                                Edit
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => handleDeleteClick(client)}>
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal open={formOpen} onClose={closeForm} title={selectedClient ? 'Edit Client' : 'New Client'} panelClassName="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(event) => handleChange('name', event.target.value)}
              required
              disabled={isSubmitting}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(event) => handleChange('email', event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(event) => handleChange('phone', event.target.value)}
              placeholder="+1 (555) 123-4567"
              disabled={isSubmitting}
            />
            <Input
              label="Company"
              value={formData.company}
              onChange={(event) => handleChange('company', event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <Input
            label="Avatar URL"
            value={formData.avatar}
            onChange={(event) => handleChange('avatar', event.target.value)}
            placeholder="https://..."
            helpText="Optional. Leave empty to auto-generate an avatar."
            disabled={isSubmitting}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Active Projects"
              type="number"
              min="0"
              value={formData.projects}
              onChange={(event) => handleChange('projects', event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-800">Status</span>
            <div className="flex gap-3 rounded-lg border border-slate-300 p-1 bg-slate-50">
              {['active', 'inactive'].map((status) => (
                <label key={status} className="flex-1">
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={formData.status === status}
                    onChange={(event) => handleChange('status', event.target.value as Client['status'])}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  <span className={`block px-4 py-2 rounded text-center text-sm font-medium cursor-pointer transition-colors ${
                    formData.status === status
                      ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                      : 'bg-transparent text-slate-600 hover:text-slate-900'
                  } ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}>
                    {status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center pt-2">
            <div>
              {selectedClient ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => handleDeleteClick(selectedClient)}
                  disabled={isSubmitting || isDeleting}
                  className="gap-2"
                >
                  <Trash2 size={18} />
                  Delete Client
                </Button>
              ) : null}
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting || isDeleting}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting || isDeleting} className="gap-2">
                {!isSubmitting && <Save size={18} />}
                {selectedClient ? 'Update Client' : 'Create Client'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
          }
        }}
        title="Delete Client"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>?
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting} disabled={isDeleting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default AdminClients;
