import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminLayout, EmployeeLayout, ClientLayout } from '../layouts';
import { Home } from '../pages/Home';
import { Login, Register, AcceptInvite, ForgotPassword, ResetPassword } from '../pages/auth';
import { Unauthorized } from '../pages/Unauthorized';
import { ProfileSettings } from '../pages/ProfileSettings';
import ProfileSettingsRoute from '../pages/ProfileSettingsRoute';
import ProtectedRoute from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { RoleProtectedRoute } from './RoleProtectedRoute';
import {
  AdminDashboard,
  AdminAnalytics,
  AdminProjects,
  AdminTasks,
  AdminEmployees,
  AdminClients,
  AdminReports,
  AdminNotifications,
  AdminSettings,
  AdminInvites,
  ClientDetails,
  ProjectDetails,
} from '../pages/admin';
import {
  EmployeeDashboard,
  EmployeeTasks,
  EmployeeProjects,
  EmployeeNotifications,
} from '../pages/employee';
import {
  ClientDashboard,
  ClientProjects,
  ClientFiles,
  ClientReports,
  ReportViewer,
  ClientNotifications,
} from '../pages/client';

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: (
      <PublicRoute>
        <Home />
      </PublicRoute>
    ),
  },
  {
    path: '/home',
    element: (
      <PublicRoute>
        <Home />
      </PublicRoute>
    ),
  },

  // Auth routes
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute>
        <Register />
      </PublicRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <PublicRoute>
        <ForgotPassword />
      </PublicRoute>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <PublicRoute>
        <ResetPassword />
      </PublicRoute>
    ),
  },
  {
    path: '/reset-password/:token',
    element: (
      <PublicRoute>
        <ResetPassword />
      </PublicRoute>
    ),
  },
  {
    path: '/profile-settings',
    element: (
      <ProtectedRoute>
        <ProfileSettingsRoute />
      </ProtectedRoute>
    ),
  },
  {
    path: '/invite/:publicId',
    element: <AcceptInvite />,
  },

  // Unauthorized access page
  {
    path: '/unauthorized',
    element: (
      <ProtectedRoute>
        <Unauthorized />
      </ProtectedRoute>
    ),
  },

  // Admin Routes
  {
    path: '/admin',
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/admin/dashboard',
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/admin/analytics',
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <AdminLayout>
          <AdminAnalytics />
        </AdminLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/admin/projects',
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <AdminLayout>
          <AdminProjects />
        </AdminLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/admin/projects/:id',
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <AdminLayout>
          <ProjectDetails />
        </AdminLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/admin/tasks',
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <AdminLayout>
          <AdminTasks />
        </AdminLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/admin/employees',
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <AdminLayout>
          <AdminEmployees />
        </AdminLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/admin/clients',
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <AdminLayout>
          <AdminClients />
        </AdminLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/admin/clients/:id',
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <AdminLayout>
          <ClientDetails />
        </AdminLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/admin/invites',
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <AdminLayout>
          <AdminInvites />
        </AdminLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/admin/reports',
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <AdminLayout>
          <AdminReports />
        </AdminLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/admin/notifications',
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <AdminLayout>
          <AdminNotifications />
        </AdminLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/admin/settings',
    element: (
      <RoleProtectedRoute requiredRoles={['admin']}>
        <AdminLayout>
          <AdminSettings />
        </AdminLayout>
      </RoleProtectedRoute>
    ),
  },

  // Employee Routes
  {
    path: '/employee',
    element: (
      <RoleProtectedRoute requiredRoles={['employee']}>
        <EmployeeLayout>
          <EmployeeDashboard />
        </EmployeeLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/employee/dashboard',
    element: (
      <RoleProtectedRoute requiredRoles={['employee']}>
        <EmployeeLayout>
          <EmployeeDashboard />
        </EmployeeLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/employee/tasks',
    element: (
      <RoleProtectedRoute requiredRoles={['employee']}>
        <EmployeeLayout>
          <EmployeeTasks />
        </EmployeeLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/employee/projects',
    element: (
      <RoleProtectedRoute requiredRoles={['employee']}>
        <EmployeeLayout>
          <EmployeeProjects />
        </EmployeeLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/employee/notifications',
    element: (
      <RoleProtectedRoute requiredRoles={['employee']}>
        <EmployeeLayout>
          <EmployeeNotifications />
        </EmployeeLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/employee/profile',
    element: (
      <RoleProtectedRoute requiredRoles={['employee']}>
        <EmployeeLayout>
          <ProfileSettings />
        </EmployeeLayout>
      </RoleProtectedRoute>
    ),
  },

  // Client Routes
  {
    path: '/client',
    element: (
      <RoleProtectedRoute requiredRoles={['client']}>
        <ClientLayout>
          <ClientDashboard />
        </ClientLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/client/dashboard',
    element: (
      <RoleProtectedRoute requiredRoles={['client']}>
        <ClientLayout>
          <ClientDashboard />
        </ClientLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/client/projects',
    element: (
      <RoleProtectedRoute requiredRoles={['client']}>
        <ClientLayout>
          <ClientProjects />
        </ClientLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/client/files',
    element: (
      <RoleProtectedRoute requiredRoles={['client']}>
        <ClientLayout>
          <ClientFiles />
        </ClientLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/client/reports',
    element: (
      <RoleProtectedRoute requiredRoles={['client']}>
        <ClientLayout>
          <ClientReports />
        </ClientLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/client/reports/:id',
    element: (
      <RoleProtectedRoute requiredRoles={['client']}>
        <ClientLayout>
          <ReportViewer />
        </ClientLayout>
      </RoleProtectedRoute>
    ),
  },
  {
    path: '/client/notifications',
    element: (
      <RoleProtectedRoute requiredRoles={['client']}>
        <ClientLayout>
          <ClientNotifications />
        </ClientLayout>
      </RoleProtectedRoute>
    ),
  },

  // Catch all
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
