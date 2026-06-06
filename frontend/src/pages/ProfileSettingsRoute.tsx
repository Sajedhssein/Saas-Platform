import { Navigate } from 'react-router-dom';
import { AdminLayout, ClientLayout, EmployeeLayout } from '../layouts';
import { ProfileSettings } from './ProfileSettings';
import useAuthStore from '../store/authStore';

export const ProfileSettingsRoute = () => {
  const { user, isInitializing, isAuthenticated } = useAuthStore();

  if (isInitializing) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'client') {
    return (
      <ClientLayout>
        <ProfileSettings />
      </ClientLayout>
    );
  }

  if (user.role === 'admin') {
    return (
      <AdminLayout>
        <ProfileSettings />
      </AdminLayout>
    );
  }

  return (
    <EmployeeLayout>
      <ProfileSettings />
    </EmployeeLayout>
  );
};

export default ProfileSettingsRoute;
