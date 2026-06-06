# Protected Routes Implementation Documentation

## Overview

Complete authentication and authorization system implemented for the React + TypeScript SaaS frontend with:

- ✅ Route guards (ProtectedRoute, PublicRoute, RoleProtectedRoute)
- ✅ Role-based access control (admin, employee, client)
- ✅ Auth persistence on page refresh
- ✅ Loading states during auth initialization
- ✅ Unauthorized access error page
- ✅ Full TypeScript type safety (zero `any` types)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       App.tsx                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  useAuthInitializer() hook                       │   │
│  │  - Runs on app mount                            │   │
│  │  - Checks localStorage for token                │   │
│  │  - Validates via /auth/me                       │   │
│  │  - Sets isInitializing = false when done        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  if (isInitializing) → <LoadingSpinner />       │   │
│  │  else → <RouterProvider router={router} />      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    Router Configuration                │
│  Each route wrapped with appropriate guard:            │
│                                                         │
│  Public: /login, /register                             │
│  ├─ <PublicRoute>  - redirects to dashboard if authed  │
│                                                         │
│  Protected: /unauthorized                              │
│  ├─ <ProtectedRoute> - redirects to /login if not auth │
│                                                         │
│  Admin: /admin/*                                        │
│  ├─ <RoleProtectedRoute requiredRoles={['admin']}>     │
│                                                         │
│  Employee: /employee/*                                  │
│  ├─ <RoleProtectedRoute requiredRoles={['employee']}>  │
│                                                         │
│  Client: /client/*                                      │
│  └─ <RoleProtectedRoute requiredRoles={['client']}>    │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│               Zustand Auth Store                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │ State:                                           │   │
│  │ - user: User | null                             │   │
│  │ - token: string | null                          │   │
│  │ - isInitializing: boolean                       │   │
│  │ - isAuthenticated: boolean                      │   │
│  │                                                  │   │
│  │ Methods:                                         │   │
│  │ - login(user, token)   → set user & token       │   │
│  │ - logout()             → clear user & token     │   │
│  │ - initializeAuth()     → validate via /auth/me  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## File Structure

### New Files Created

```
src/
├── routes/
│   ├── ProtectedRoute.tsx          ← Auth required, redirect to /login if missing
│   ├── PublicRoute.tsx             ← No auth required, redirect to dashboard if authenticated
│   └── RoleProtectedRoute.tsx       ← Specific role required, redirect to /unauthorized if wrong role
├── pages/
│   └── Unauthorized.tsx            ← Error page for unauthorized access
├── hooks/
│   └── useAuthInitializer.ts       ← Initialize auth on app load
└── components/ui/
    └── LoadingSpinner.tsx          ← Loading indicator during auth check
```

### Updated Files

```
src/
├── store/authStore.ts              ← Added initializeAuth(), isInitializing, isAuthenticated
├── services/authService.ts         ← Implemented getCurrentUser(), login(), refreshToken()
├── routes/router.tsx               ← Wrapped all routes with guards
├── App.tsx                         ← Added useAuthInitializer hook and loading state
├── components/ui/index.ts          ← Exported LoadingSpinner
└── hooks/index.ts                  ← Exported useAuthInitializer
```

## Component Details

### 1. ProtectedRoute.tsx

Wraps routes that require authentication. Redirects unauthenticated users to login.

```tsx
<ProtectedRoute>
  <Unauthorized /> {/* Any protected content */}
</ProtectedRoute>
```

**Logic:**

- If `isInitializing` → return null (wait for auth check)
- If not `isAuthenticated` → redirect to `/login`
- Otherwise → render children

### 2. PublicRoute.tsx

Wraps public routes (login, register). Redirects authenticated users to their dashboard based on role.

```tsx
<PublicRoute>
  <Login /> {/* Login page */}
</PublicRoute>
```

**Logic:**

- If `isInitializing` → return null
- If authenticated → redirect to role-based dashboard:
  - `admin` → `/admin/dashboard`
  - `employee` → `/employee/dashboard`
  - `client` → `/client/dashboard`
- Otherwise → render children

### 3. RoleProtectedRoute.tsx

Wraps role-specific routes. Enforces role-based access control.

```tsx
<RoleProtectedRoute requiredRoles={["admin"]}>
  <AdminLayout>
    <AdminDashboard />
  </AdminLayout>
</RoleProtectedRoute>
```

**Logic:**

- If `isInitializing` → return null
- If not `isAuthenticated` → redirect to `/login`
- If wrong role → redirect to `/unauthorized`
- Otherwise → render children

### 4. Unauthorized.tsx

Error page displayed when user tries to access a page they don't have permission for.

**Features:**

- Lock icon visual
- Friendly error message
- "Go to Dashboard" button (redirects based on user role)
- "Go Back" button (browser back)

### 5. useAuthInitializer.ts

Custom hook that initializes authentication on app load.

```tsx
export const useAuthInitializer = (): void => {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);
};
```

**Process:**

1. Runs on app mount
2. Checks localStorage for token
3. If token exists, validates via GET `/auth/me`
4. Restores user data to Zustand store
5. Sets `isInitializing = false` when complete

### 6. LoadingSpinner.tsx

Animated full-screen loading indicator shown during initial auth check.

```tsx
if (isInitializing) {
  return <LoadingSpinner />;
}
```

## Updated Zustand Store

```tsx
interface AuthState {
  user: User | null;
  token: string | null;
  isInitializing: boolean; // ← NEW: true while checking auth
  isAuthenticated: boolean; // ← NEW: true if user logged in
  login: (user: User, token: string) => void;
  logout: () => void;
  initializeAuth: () => Promise<void>; // ← NEW: async auth validation
}

// Usage in components
const { user, isAuthenticated, isInitializing } = useAuthStore();
```

## Updated Auth Service

```tsx
export const authService = {
  login: async (credentials) => {
    /* POST /auth/login */
  },
  logout: async () => {
    /* POST /auth/logout */
  },
  getCurrentUser: async () => {
    /* GET /auth/me */
  }, // ← NEW
  refreshToken: async () => {
    /* POST /auth/refresh */
  },
};
```

## Auth Flow Diagrams

### 1. Initial App Load

```
App Mount
  ↓
useAuthInitializer() runs
  ↓
initializeAuth() called
  ↓
Check localStorage for token
  ├─ No token → set isInitializing=false, isAuthenticated=false
  └─ Token exists → validate via GET /auth/me
       ├─ Success → restore user data, set isInitializing=false, isAuthenticated=true
       └─ Error (401) → clear token, set isInitializing=false, isAuthenticated=false
  ↓
isInitializing=false
  ├─ Show LoadingSpinner (loading done)
  └─ Render Router with routes
```

### 2. Unauthenticated User Flow

```
Unauthenticated User
  ↓
Tries to access /admin/dashboard
  ↓
RoleProtectedRoute checks: isAuthenticated=false
  ↓
Redirect to /login
  ↓
PublicRoute allows (no auth required for login)
  ↓
Show Login page ✓
```

### 3. Authenticated User Flow - Correct Role

```
Authenticated Admin
  ↓
Tries to access /admin/dashboard
  ↓
RoleProtectedRoute checks: isAuthenticated=true, user.role='admin'
  ↓
Required roles = ['admin']
  ↓
User role matches required roles ✓
  ↓
Show AdminDashboard ✓
```

### 4. Authenticated User Flow - Wrong Role

```
Authenticated Employee
  ↓
Tries to access /admin/dashboard
  ↓
RoleProtectedRoute checks: isAuthenticated=true, user.role='employee'
  ↓
Required roles = ['admin']
  ↓
User role doesn't match! ✗
  ↓
Redirect to /unauthorized
  ↓
Show Unauthorized page with error ✓
```

### 5. Authenticated User Visits Login

```
Authenticated Admin
  ↓
Tries to access /login
  ↓
PublicRoute checks: isAuthenticated=true
  ↓
Redirect to /admin/dashboard (role-based redirect)
  ↓
Show AdminDashboard ✓
```

### 6. Page Refresh (Persistence)

```
Admin logged in at /admin/dashboard
  ↓
Browser refresh F5
  ↓
App remounts, useAuthInitializer() runs
  ↓
Check localStorage: token="jwt_token_here"
  ↓
Call GET /auth/me with Authorization: Bearer jwt_token_here
  ↓
Response: { user: { id, name, email, role: 'admin' } }
  ↓
Zustand restored: user, token, isAuthenticated=true
  ↓
Same /admin/dashboard now loads ✓
```

## Router Configuration

All routes now follow this pattern:

```tsx
{
  path: '/admin/dashboard',
  element: (
    <RoleProtectedRoute requiredRoles={['admin']}>
      <AdminLayout>
        <AdminDashboard />
      </AdminLayout>
    </RoleProtectedRoute>
  ),
}
```

**Route Categories:**

1. **Public Routes** (no auth needed)
   - `/` (Home)

2. **Public Auth Routes** (redirects to dashboard if authenticated)
   - `/login`
   - `/register`

3. **Protected Routes** (auth required, role-agnostic)
   - `/unauthorized`

4. **Admin Routes** (admin only)
   - `/admin/dashboard`
   - `/admin/analytics`
   - `/admin/projects`
   - `/admin/tasks`
   - `/admin/employees`
   - `/admin/clients`
   - `/admin/reports`
   - `/admin/notifications`
   - `/admin/settings`

5. **Employee Routes** (employee only)
   - `/employee/dashboard`
   - `/employee/tasks`

6. **Client Routes** (client only)
   - `/client/dashboard`
   - `/client/projects`
   - `/client/files`

## App.tsx Integration

```tsx
import { useAuthInitializer } from "./hooks/useAuthInitializer";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";

function App() {
  useAuthInitializer(); // ← Initialize auth on mount

  return <AppContent />;
}

function AppContent() {
  const isInitializing = useAuthStore((state) => state.isInitializing);

  if (isInitializing) {
    return <LoadingSpinner />; // ← Show while checking auth
  }

  return <RouterProvider router={router} />;
}
```

## API Requirements

Backend must implement these endpoints:

### 1. POST /auth/login

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

### 2. GET /auth/me (Protected, requires Authorization header)

Request:

```
GET /auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

### 3. POST /auth/logout (Protected)

Request:

```
POST /auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Response:

```json
{
  "message": "Logged out successfully"
}
```

### 4. POST /auth/refresh (Protected)

Request:

```
POST /auth/refresh
Authorization: Bearer old_token
```

Response:

```json
{
  "token": "new_jwt_token_here",
  "user": { ... }
}
```

## Type Safety

All code is TypeScript with **zero `any` types**:

```tsx
// User type from types/index.ts
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "employee" | "client"; // ← Literal union type
}

// Route guards properly typed
interface RoleProtectedRouteProps {
  children: ReactNode;
  requiredRoles: User["role"][]; // ← Type-safe role array
}
```

## Testing Checklist

- [ ] Unauthenticated user redirected from `/admin/dashboard` to `/login`
- [ ] Unauthenticated user redirected from `/employee/tasks` to `/login`
- [ ] Unauthenticated user redirected from `/client/dashboard` to `/login`
- [ ] Authenticated admin can access `/admin/dashboard`
- [ ] Authenticated admin redirected from `/admin/dashboard` to `/login` after logout
- [ ] Authenticated employee redirected from `/admin/dashboard` to `/unauthorized`
- [ ] Authenticated employee can access `/employee/dashboard`
- [ ] Authenticated client redirected from `/employee/tasks` to `/unauthorized`
- [ ] Authenticated client can access `/client/dashboard`
- [ ] Authenticated user redirected from `/login` to `/admin/dashboard`
- [ ] Authenticated user redirected from `/register` to `/admin/dashboard`
- [ ] Page refresh restores user data from localStorage
- [ ] Page refresh validates token via `/auth/me`
- [ ] Invalid/expired token on refresh clears localStorage and redirects to login
- [ ] Loading spinner shown during initial auth check
- [ ] No redirects visible after spinner completes

## Scalability Notes

To add new routes/roles:

1. **Add new role to User type:**

   ```tsx
   role: "admin" | "employee" | "client" | "manager";
   ```

2. **Create new layout** (if needed):

   ```tsx
   export const ManagerLayout = ({ children }) => (
     <div className="flex">
       <Sidebar items={managerSidebarItems} />
       <Navbar />
       {children}
     </div>
   );
   ```

3. **Create new pages:**

   ```tsx
   export const ManagerDashboard = () => {
     /* ... */
   };
   ```

4. **Add routes to router:**
   ```tsx
   {
     path: '/manager/dashboard',
     element: (
       <RoleProtectedRoute requiredRoles={['manager']}>
         <ManagerLayout><ManagerDashboard /></ManagerLayout>
       </RoleProtectedRoute>
     ),
   }
   ```

## Common Issues & Solutions

### Issue: Infinite redirect loop

**Cause:** Auth checks not complete when router renders
**Solution:** App.tsx checks `isInitializing` and shows `LoadingSpinner`

### Issue: Token not persisting on refresh

**Cause:** `initializeAuth()` not called on app load
**Solution:** `useAuthInitializer()` hook in App.tsx ensures it runs

### Issue: Users can access wrong role pages

**Cause:** Route guards not properly applied
**Solution:** All protected routes use `RoleProtectedRoute` with `requiredRoles`

### Issue: "any" types in guard components

**Cause:** Not properly typing props
**Solution:** All components use proper TypeScript interfaces

## Next Steps

1. ✅ Implement login with actual API integration
2. ✅ Create protected routes system
3. ⚠️ Test auth flow with backend
4. ⚠️ Implement logout button in Navbar
5. ⚠️ Add register endpoint integration
6. ⚠️ Implement password reset flow
7. ⚠️ Add 2FA (optional)
