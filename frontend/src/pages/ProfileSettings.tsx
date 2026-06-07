import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, Globe, Loader2, Lock, Settings } from 'lucide-react';
import { Avatar, Button, DataFetchError, Input, PageContainer } from '../components/ui';
import { authService } from '../services/authService';
import { settingsService, SettingsValidationError } from '../services/settingsService';
import useAuthStore from '../store/authStore';
import type { User as AppUser } from '../types';
import type { NotificationSettings } from '../types/settings';

type SettingsTab = 'general' | 'security' | 'notifications' | 'preferences';
type GeneralFieldErrors = Partial<Record<'name' | 'email' | 'phone' | 'department' | 'position', string>>;
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

interface EmployeeGeneralSettings {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  department: string;
  position: string;
}

const defaultNotificationSettings: NotificationSettings = {
  task_assigned: false,
  task_completed: false,
  project_updated: false,
  report_generated: false,
  employee_joined: false,
  invite_accepted: false,
};

const defaultPreferences = {
  theme: 'system',
  language: 'en',
  timezone: 'UTC',
};

const Spinner = () => (
  <div className="flex items-center justify-center py-10">
    <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
  </div>
);

const normalizeGeneralSettings = (user: Partial<AppUser> | null | undefined): EmployeeGeneralSettings => ({
  name: user?.name ?? '',
  email: user?.email ?? '',
  phone: user?.phone ?? '',
  avatar: user?.avatar ?? '',
  department: user?.department ?? '',
  position: user?.position ?? '',
});

export const ProfileSettings = () => {
  const authUser = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);
  const isClientUser = authUser?.role === 'client';

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const [generalSettings, setGeneralSettings] = useState<EmployeeGeneralSettings>(() => normalizeGeneralSettings(authUser));
  const [generalLoaded, setGeneralLoaded] = useState(Boolean(authUser));
  const [generalLoading, setGeneralLoading] = useState(true);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
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

  const [preferencesDraft, setPreferencesDraft] = useState(defaultPreferences);
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  const loadGeneralSettings = useCallback(async () => {
    try {
      setGeneralLoading(true);
      setGeneralError(null);
      const currentUser = await authService.getCurrentUser();
      setGeneralSettings(normalizeGeneralSettings(currentUser));
      setGeneralLoaded(true);
    } catch (error) {
      if (authUser) {
        setGeneralSettings(normalizeGeneralSettings(authUser));
        setGeneralLoaded(true);
        setGeneralError(null);
      } else {
        setGeneralLoaded(false);
        setGeneralError(error instanceof Error ? error.message : 'Failed to load profile settings');
      }
    } finally {
      setGeneralLoading(false);
    }
  }, [authUser]);

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

  useEffect(() => {
    let cancelled = false;

    const initializeSettings = async () => {
      try {
        setGeneralLoading(true);
        setNotificationLoading(true);

        const [generalResult, notificationResult] = await Promise.allSettled([
          authService.getCurrentUser(),
          settingsService.getNotificationSettings(),
        ]);

        if (cancelled) {
          return;
        }

        if (generalResult.status === 'fulfilled') {
          setGeneralSettings(normalizeGeneralSettings(generalResult.value));
          setGeneralLoaded(true);
          setGeneralError(null);
        } else if (authUser) {
          setGeneralSettings(normalizeGeneralSettings(authUser));
          setGeneralLoaded(true);
          setGeneralError(null);
        } else {
          setGeneralError(generalResult.reason instanceof Error ? generalResult.reason.message : 'Failed to load profile settings');
        }

        if (notificationResult.status === 'fulfilled') {
          setNotificationSettings(notificationResult.value);
          setNotificationLoaded(true);
          setNotificationError(null);
        } else {
          setNotificationError(notificationResult.reason instanceof Error ? notificationResult.reason.message : 'Failed to load notification settings');
        }
      } finally {
        if (!cancelled) {
          setGeneralLoading(false);
          setNotificationLoading(false);
        }
      }
    };

    void initializeSettings();

    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const tabs: Array<{ id: SettingsTab; label: string; icon: ReactNode }> = [
    { id: 'general', label: 'General', icon: <Settings size={18} /> },
    { id: 'security', label: 'Security', icon: <Lock size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'preferences', label: 'Preferences', icon: <Globe size={18} /> },
  ];

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

  const handleGeneralSubmit = async () => {
    const payload = {
      name: generalSettings.name.trim(),
      email: generalSettings.email.trim(),
      phone: generalSettings.phone.trim() || null,
      department: generalSettings.department.trim() || null,
      position: generalSettings.position.trim() || null,
    };

    if (!payload.name) {
      setGeneralFieldErrors({ name: 'Name is required.' });
      return;
    }

    try {
      setGeneralSaving(true);
      setGeneralError(null);
      setGeneralFieldErrors({});

      const updated = await authService.updateCurrentUser({
        name: payload.name,
        email: payload.email,
        phone: payload.phone ?? undefined,
        department: payload.department ?? undefined,
        position: payload.position ?? undefined,
      });

      setGeneralSettings(normalizeGeneralSettings(updated));
      if (token) {
        login(updated, token);
      }
      toast.success('Profile saved successfully.');
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : 'Failed to save profile settings');
    } finally {
      setGeneralSaving(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setAvatarUploading(true);
      setGeneralError(null);
      const updated = await authService.uploadProfileAvatar(file);
      setGeneralSettings(normalizeGeneralSettings(updated));

      if (token) {
        login(updated, token);
      }

      toast.success('Profile picture updated.');
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : 'Failed to upload profile picture');
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
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

  const handlePreferencesSubmit = async () => {
    setPreferencesSaving(true);
    try {
      toast.success('Preferences saved locally.');
    } finally {
      setPreferencesSaving(false);
    }
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
            <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar imageUrl={generalSettings.avatar} name={generalSettings.name} size="lg" />
                <div>
                  <p className="text-sm font-semibold leading-6 text-slate-900">Profile picture</p>
                  <p className="text-sm leading-6 text-slate-600">Upload a JPG, PNG, or WebP image up to 2 MB.</p>
                </div>
              </div>
              <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold leading-none text-slate-900 transition-colors hover:bg-slate-50">
                {avatarUploading ? 'Uploading...' : 'Upload Photo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => void handleAvatarChange(event)}
                  disabled={avatarUploading || generalSaving}
                />
              </label>
            </div>
            <Input
              label="Name"
              placeholder="Your name"
              value={generalSettings.name}
              onChange={(event) => setGeneralSettings((current) => ({ ...current, name: event.target.value }))}
              error={generalFieldErrors.name}
              disabled={generalSaving}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={generalSettings.email}
              onChange={(event) => setGeneralSettings((current) => ({ ...current, email: event.target.value }))}
              error={generalFieldErrors.email}
              disabled
              helpText="Email is managed by the authentication system."
            />
            <Input
              label="Phone"
              placeholder="+1 (555) 000-0000"
              value={generalSettings.phone}
              onChange={(event) => setGeneralSettings((current) => ({ ...current, phone: event.target.value }))}
              error={generalFieldErrors.phone}
              disabled={generalSaving}
            />
            {!isClientUser && (
              <Input
                label="Department"
                placeholder="Customer Success"
                value={generalSettings.department}
                onChange={(event) => setGeneralSettings((current) => ({ ...current, department: event.target.value }))}
                error={generalFieldErrors.department}
                disabled={generalSaving}
              />
            )}
            <Input
              label="Position"
              placeholder="Account Manager"
              value={generalSettings.position}
              onChange={(event) => setGeneralSettings((current) => ({ ...current, position: event.target.value }))}
              error={generalFieldErrors.position}
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
            <p className="text-sm text-blue-900">Password changes update your account security profile.</p>
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

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Preferences</h3>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-600">These preferences are UI placeholders until backend support is available.</p>
          </div>
          <Input
            label="Theme"
            placeholder="system"
            value={preferencesDraft.theme}
            onChange={(event) => setPreferencesDraft((current) => ({ ...current, theme: event.target.value }))}
            disabled={preferencesSaving}
          />
          <Input
            label="Language"
            placeholder="en"
            value={preferencesDraft.language}
            onChange={(event) => setPreferencesDraft((current) => ({ ...current, language: event.target.value }))}
            disabled={preferencesSaving}
          />
          <Input
            label="Timezone"
            placeholder="UTC"
            value={preferencesDraft.timezone}
            onChange={(event) => setPreferencesDraft((current) => ({ ...current, timezone: event.target.value }))}
            disabled={preferencesSaving}
          />
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralTab();
      case 'security':
        return renderSecurityTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'preferences':
        return renderPreferencesTab();
      default:
        return null;
    }
  };

  const isSaving = generalSaving || avatarUploading || securitySaving || notificationSaving || preferencesSaving;

  return (
    <PageContainer title="Profile Settings" description="Manage your employee profile and workspace preferences.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="sticky top-24 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="divide-y divide-slate-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
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
                    } else if (activeTab === 'preferences') {
                      void handlePreferencesSubmit();
                    }
                  }}
                  isLoading={isSaving}
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (activeTab === 'general') {
                      void loadGeneralSettings();
                      setGeneralFieldErrors({});
                    } else if (activeTab === 'security') {
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setSecurityFieldErrors({});
                      setSecurityError(null);
                    } else if (activeTab === 'notifications') {
                      void loadNotificationSettings();
                      setNotificationFieldErrors({});
                    } else if (activeTab === 'preferences') {
                      setPreferencesDraft(defaultPreferences);
                    }
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default ProfileSettings;
