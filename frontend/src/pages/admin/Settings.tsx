import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, CreditCard, Globe, Lock, Settings, Users, Loader2 } from 'lucide-react';
import { Button, DataFetchError, EmptyState, Input, PageContainer } from '../../components/ui';
import {
  SettingsValidationError,
  settingsService,
} from '../../services/settingsService';
import type {
  GeneralSettings,
  NotificationSettings,
  TeamMember,
  TeamSettingsResponse,
} from '../../types';

type SettingsTab = 'general' | 'security' | 'notifications' | 'team' | 'billing' | 'api';
type GeneralFieldErrors = Partial<Record<'name' | 'email' | 'phone', string>>;
type SecurityFieldErrors = Partial<Record<'current_password' | 'new_password' | 'new_password_confirmation', string>>;
type NotificationFieldErrors = Partial<Record<keyof NotificationSettings, string>>;

const notificationItems: Array<{ key: keyof NotificationSettings; label: string }> = [
  { key: 'task_assigned', label: 'Task Assigned' },
  { key: 'task_completed', label: 'Task Completed' },
  { key: 'project_updated', label: 'Project Updated' },
  { key: 'report_generated', label: 'Report Generated' },
  { key: 'employee_joined', label: 'Employee Joined' },
  { key: 'invite_accepted', label: 'Invite Accepted' },
];

const defaultGeneralSettings: GeneralSettings = {
  name: '',
  email: '',
  phone: '',
};

const defaultNotificationSettings: NotificationSettings = {
  task_assigned: false,
  task_completed: false,
  project_updated: false,
  report_generated: false,
  employee_joined: false,
  invite_accepted: false,
};

const Spinner = () => (
  <div className="flex items-center justify-center py-10">
    <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
  </div>
);

export const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(defaultGeneralSettings);
  const [generalLoaded, setGeneralLoaded] = useState(false);
  const [generalLoading, setGeneralLoading] = useState(true);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalFieldErrors, setGeneralFieldErrors] = useState<GeneralFieldErrors>({});

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityFieldErrors, setSecurityFieldErrors] = useState<SecurityFieldErrors>({});

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [notificationLoaded, setNotificationLoaded] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationFieldErrors, setNotificationFieldErrors] = useState<NotificationFieldErrors>({});

  const [teamSettings, setTeamSettings] = useState<TeamSettingsResponse>({ members: [], totalMembers: 0 });
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);

  const loadGeneralSettings = useCallback(async () => {
    try {
      setGeneralLoading(true);
      setGeneralError(null);
      const data = await settingsService.getGeneralSettings();
      setGeneralSettings({
        name: data.name ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
      });
      setGeneralLoaded(true);
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : 'Failed to load general settings');
    } finally {
      setGeneralLoading(false);
    }
  }, []);

  const loadNotificationSettings = useCallback(async () => {
    try {
      setNotificationLoading(true);
      setNotificationError(null);
      const data = await settingsService.getNotificationSettings();
      setNotificationSettings(data);
      setNotificationLoaded(true);
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Failed to load notification settings');
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  const loadTeamSettings = useCallback(async () => {
    try {
      setTeamLoading(true);
      setTeamError(null);
      const data = await settingsService.getTeamSettings();
      setTeamSettings(data);
      setTeamLoaded(true);
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Failed to load team settings');
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeSettings = async () => {
      try {
        setGeneralLoading(true);
        setNotificationLoading(true);
        setTeamLoading(true);

        const [generalResult, notificationResult, teamResult] = await Promise.allSettled([
          settingsService.getGeneralSettings(),
          settingsService.getNotificationSettings(),
          settingsService.getTeamSettings(),
        ]);

        if (cancelled) {
          return;
        }

        if (generalResult.status === 'fulfilled') {
          setGeneralSettings({
            name: generalResult.value.name ?? '',
            email: generalResult.value.email ?? '',
            phone: generalResult.value.phone ?? '',
          });
          setGeneralLoaded(true);
          setGeneralError(null);
        } else {
          setGeneralError(generalResult.reason instanceof Error ? generalResult.reason.message : 'Failed to load general settings');
        }

        if (notificationResult.status === 'fulfilled') {
          setNotificationSettings(notificationResult.value);
          setNotificationLoaded(true);
          setNotificationError(null);
        } else {
          setNotificationError(notificationResult.reason instanceof Error ? notificationResult.reason.message : 'Failed to load notification settings');
        }

        if (teamResult.status === 'fulfilled') {
          setTeamSettings(teamResult.value);
          setTeamLoaded(true);
          setTeamError(null);
        } else {
          setTeamError(teamResult.reason instanceof Error ? teamResult.reason.message : 'Failed to load team settings');
        }
      } finally {
        if (!cancelled) {
          setGeneralLoading(false);
          setNotificationLoading(false);
          setTeamLoading(false);
        }
      }
    };

    void initializeSettings();

    return () => {
      cancelled = true;
    };
  }, [loadGeneralSettings, loadNotificationSettings, loadTeamSettings]);

  const tabs: Array<{ id: SettingsTab; label: string; icon: ReactNode }> = [
    { id: 'general', label: 'General', icon: <Settings size={18} /> },
    { id: 'security', label: 'Security', icon: <Lock size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'team', label: 'Team & Access', icon: <Users size={18} /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard size={18} /> },
    { id: 'api', label: 'API & Integrations', icon: <Globe size={18} /> },
  ];

  const hasEditableActions = activeTab === 'general' || activeTab === 'security' || activeTab === 'notifications';

  const resetGeneralSettings = async () => {
    await loadGeneralSettings();
    setGeneralFieldErrors({});
  };

  const resetNotificationSettings = async () => {
    await loadNotificationSettings();
    setNotificationFieldErrors({});
  };

  const handleGeneralSubmit = async () => {
    const payload = {
      name: generalSettings.name.trim(),
      email: generalSettings.email.trim() || null,
      phone: generalSettings.phone.trim() || null,
    };

    if (!payload.name) {
      setGeneralFieldErrors({ name: 'Company name is required.' });
      return;
    }

    try {
      setGeneralSaving(true);
      setGeneralError(null);
      setGeneralFieldErrors({});
      const updated = await settingsService.updateGeneralSettings(payload);
      setGeneralSettings({
        name: updated.name ?? payload.name,
        email: updated.email ?? '',
        phone: updated.phone ?? '',
      });
      toast.success('General settings saved.');
    } catch (error) {
      if (error instanceof SettingsValidationError) {
        setGeneralFieldErrors({
          name: error.fieldErrors.name,
          email: error.fieldErrors.email,
          phone: error.fieldErrors.phone,
        });
        setGeneralError(error.message);
        return;
      }

      setGeneralError(error instanceof Error ? error.message : 'Failed to save general settings');
    } finally {
      setGeneralSaving(false);
    }
  };

  const handleSecuritySubmit = async () => {
    if (!currentPassword.trim()) {
      setSecurityFieldErrors({ current_password: 'Current password is required.' });
      return;
    }

    if (!newPassword.trim()) {
      setSecurityFieldErrors({ new_password: 'New password is required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityFieldErrors({ new_password_confirmation: 'Passwords do not match.' });
      return;
    }

    try {
      setSecuritySaving(true);
      setSecurityError(null);
      setSecurityFieldErrors({});

      await settingsService.updateSecuritySettings({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully.');
    } catch (error) {
      if (error instanceof SettingsValidationError) {
        setSecurityFieldErrors({
          current_password: error.fieldErrors.current_password,
          new_password: error.fieldErrors.new_password,
          new_password_confirmation: error.fieldErrors.new_password_confirmation,
        });
        setSecurityError(error.message);
        return;
      }

      setSecurityError(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleNotificationSubmit = async () => {
    try {
      setNotificationSaving(true);
      setNotificationError(null);
      setNotificationFieldErrors({});

      const updated = await settingsService.updateNotificationSettings(notificationSettings);
      setNotificationSettings(updated);
      toast.success('Notification preferences saved.');
    } catch (error) {
      if (error instanceof SettingsValidationError) {
        setNotificationFieldErrors({
          task_assigned: error.fieldErrors.task_assigned,
          task_completed: error.fieldErrors.task_completed,
          project_updated: error.fieldErrors.project_updated,
          report_generated: error.fieldErrors.report_generated,
          employee_joined: error.fieldErrors.employee_joined,
          invite_accepted: error.fieldErrors.invite_accepted,
        });
        setNotificationError(error.message);
        return;
      }

      setNotificationError(error instanceof Error ? error.message : 'Failed to save notification preferences');
    } finally {
      setNotificationSaving(false);
    }
  };

  const renderSectionError = (message: string | null, onRetry: () => void) => {
    if (!message) {
      return null;
    }

    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <div className="flex items-start justify-between gap-4">
          <p>{message}</p>
          <button type="button" onClick={onRetry} className="shrink-0 font-medium text-red-700 hover:text-red-900">
            Retry
          </button>
        </div>
      </div>
    );
  };

  const renderGeneralTab = () => {
    if (generalLoading && !generalLoaded) {
      return <Spinner />;
    }

    if (generalError && !generalLoaded) {
      return <DataFetchError message={generalError} onRetry={() => void loadGeneralSettings()} />;
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">General Settings</h3>
          <div className="space-y-4">
            {renderSectionError(generalError, () => void loadGeneralSettings())}
            <Input
              label="Company Name"
              placeholder="Your Company"
              value={generalSettings.name}
              onChange={(event) => setGeneralSettings((current) => ({ ...current, name: event.target.value }))}
              error={generalFieldErrors.name}
              disabled={generalSaving}
            />
            <Input
              label="Company Email"
              type="email"
              placeholder="support@company.com"
              value={generalSettings.email ?? ''}
              onChange={(event) => setGeneralSettings((current) => ({ ...current, email: event.target.value }))}
              error={generalFieldErrors.email}
              disabled={generalSaving}
            />
            <Input
              label="Company Phone"
              placeholder="+1 (555) 000-0000"
              value={generalSettings.phone ?? ''}
              onChange={(event) => setGeneralSettings((current) => ({ ...current, phone: event.target.value }))}
              error={generalFieldErrors.phone}
              disabled={generalSaving}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Security Settings</h3>
        <div className="space-y-4">
          {renderSectionError(securityError, () => setSecurityError(null))}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              Two-factor authentication is <span className="font-semibold">enabled</span>
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-medium text-slate-900">Change Password</h4>
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              error={securityFieldErrors.current_password}
              disabled={securitySaving}
            />
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-3"
              error={securityFieldErrors.new_password}
              disabled={securitySaving}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-3"
              error={securityFieldErrors.new_password_confirmation}
              disabled={securitySaving}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => {
    if (notificationLoading && !notificationLoaded) {
      return <Spinner />;
    }

    if (notificationError && !notificationLoaded) {
      return <DataFetchError message={notificationError} onRetry={() => void loadNotificationSettings()} />;
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Notification Preferences</h3>
          <div className="space-y-4">
            {renderSectionError(notificationError, () => void loadNotificationSettings())}
            {notificationItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">{item.label}</label>
                  {notificationFieldErrors[item.key] && (
                    <p className="mt-1 text-xs text-red-700">{notificationFieldErrors[item.key]}</p>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(notificationSettings[item.key])}
                  onChange={(event) => setNotificationSettings((current) => ({ ...current, [item.key]: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  disabled={notificationSaving}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTeamTab = () => {
    if (teamLoading && !teamLoaded) {
      return <Spinner />;
    }

    if (teamError && !teamLoaded) {
      return <DataFetchError message={teamError} onRetry={() => void loadTeamSettings()} />;
    }

    return (
      <div className="space-y-6">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Team Members</h3>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Total Team Members: {teamSettings.totalMembers}
            </div>
          </div>

          {renderSectionError(teamError, () => void loadTeamSettings())}

          {teamSettings.members.length === 0 ? (
            <EmptyState title="No team members" message="There are no members in this company yet." />
          ) : (
            <div className="space-y-3">
              {teamSettings.members.map((member: TeamMember) => (
                <div key={member.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">{member.name}</p>
                    <p className="text-sm text-slate-600">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {member.role ?? 'Member'}
                    </span>
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800">
                      {member.status ?? 'active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralTab();
      case 'security':
        return renderSecurityTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'team':
        return renderTeamTab();
      case 'billing':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Billing Information</h3>
              <div className="mb-4 rounded-lg bg-slate-50 p-4">
                <p className="mb-2 text-sm text-slate-600">Current Plan</p>
                <p className="text-2xl font-bold text-slate-900">Professional</p>
                <p className="mt-1 text-sm text-slate-600">$99/month • Renews on May 19, 2026</p>
              </div>
              <Button variant="primary">Upgrade Plan</Button>
            </div>
          </div>
        );
      case 'api':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-slate-900">API Keys</h3>
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">Production API Key</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">pk_live_••••••••••••••••</p>
                    </div>
                    <Button variant="outline" size="sm">Regenerate</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <PageContainer title="Settings" description="Manage your account and system settings">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="sticky top-24 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="divide-y divide-slate-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeTab === tab.id
                      ? 'border-l-4 border-blue-600 bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon}
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            {renderContent()}

            <div className="mt-8 border-t border-slate-200 pt-6">
              {hasEditableActions ? (
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (activeTab === 'general') {
                        void handleGeneralSubmit();
                      } else if (activeTab === 'security') {
                        void handleSecuritySubmit();
                      } else if (activeTab === 'notifications') {
                        void handleNotificationSubmit();
                      }
                    }}
                    isLoading={generalSaving || securitySaving || notificationSaving}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (activeTab === 'general') {
                        void resetGeneralSettings();
                      } else if (activeTab === 'security') {
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setSecurityFieldErrors({});
                        setSecurityError(null);
                      } else if (activeTab === 'notifications') {
                        void resetNotificationSettings();
                      }
                    }}
                    disabled={generalSaving || securitySaving || notificationSaving}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">This section is read-only.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default AdminSettings;
