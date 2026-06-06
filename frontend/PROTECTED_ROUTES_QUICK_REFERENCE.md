# Protected Routes - Quick Reference Guide

## 🔐 How It Works

1. **App Loads** → Auth initializer checks localStorage
2. **Token Found** → Validates via `/auth/me`
3. **User Restored** → Zustand store updated
4. **Routes Loaded** → Guards check permissions
5. **Access Granted** → Show page (if authorized)
6. **Access Denied** → Redirect to `/login` or `/unauthorized`

## 📦 New Components

### ProtectedRoute

```tsx
// Wraps routes requiring authentication
<ProtectedRoute>
  <Unauthorized />
</ProtectedRoute>
```

### PublicRoute

```tsx
// Wraps login/register, redirects if authenticated
<PublicRoute>
  <Login />
</PublicRoute>
```

### RoleProtectedRoute

```tsx
// Wraps role-specific pages
<RoleProtectedRoute requiredRoles={["admin"]}>
  <AdminLayout>
    <AdminDashboard />
  </AdminLayout>
</RoleProtectedRoute>
```

### LoadingSpinner

```tsx
// Full-screen loader during auth init
// Shown while isInitializing = true
```

## 🎯 Usage Examples

### In Components

```tsx
import useAuthStore from "./store/authStore";

export const MyComponent = () => {
  const { user, isAuthenticated, isInitializing } = useAuthStore();

  if (isInitializing) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <p>Please log in</p>;
  }

  return <p>Welcome, {user?.name}!</p>;
};
```

### In API Calls

```tsx
import { authService } from "./services/authService";
import useAuthStore from "./store/authStore";

export const LoginForm = () => {
  const { login } = useAuthStore();

  const handleLogin = async (email: string, password: string) => {
    try {
      const { token, user } = await authService.login({ email, password });
      login(user, token);
      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  // ...
};
```

## 🔑 Auth Store API

```tsx
const authStore = useAuthStore();

// Properties
authStore.user; // User | null
authStore.token; // string | null
authStore.isAuthenticated; // boolean
authStore.isInitializing; // boolean

// Methods
authStore.login(user, token); // Set authenticated user
authStore.logout(); // Clear auth state
authStore.initializeAuth(); // Restore auth from storage
```

## 🛂 Route Protection Rules

| Try to access         | Your role         | Result     | Redirect to        |
| --------------------- | ----------------- | ---------- | ------------------ |
| `/admin/dashboard`    | Not authenticated | ❌ Blocked | `/login`           |
| `/admin/dashboard`    | Admin             | ✅ Allowed | -                  |
| `/admin/dashboard`    | Employee          | ❌ Blocked | `/unauthorized`    |
| `/employee/dashboard` | Not authenticated | ❌ Blocked | `/login`           |
| `/employee/dashboard` | Employee          | ✅ Allowed | -                  |
| `/employee/dashboard` | Admin             | ❌ Blocked | `/unauthorized`    |
| `/login`              | Not authenticated | ✅ Allowed | -                  |
| `/login`              | Authenticated     | ❌ Blocked | `/admin/dashboard` |

## 🚀 Quick Start

### 1. Start Backend

```bash
cd backend
php artisan serve --port=8000
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

### 3. Login

- Go to http://localhost:5173/login
- Enter credentials
- Auto-redirects to dashboard

### 4. Protected Pages

- Try accessing `/admin/dashboard` without login → redirected to `/login`
- Login as admin → access allowed
- Login as employee → redirected to `/unauthorized`

## ⚙️ Configuration

### Add New Role

1. Update `types/index.ts`:

```tsx
role: "admin" | "employee" | "client" | "manager";
```

2. Create layout (if needed):

```tsx
export const ManagerLayout = ({ children }) => (
  <div className="flex">
    <Sidebar />
    <main>{children}</main>
  </div>
);
```

3. Add routes to `router.tsx`:

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

## 🔄 Auth Flow Sequence

```
┌─────────────────┐
│  App Mounts     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ useAuthInitializer() runs       │
│ - Check localStorage token      │
│ - Show LoadingSpinner           │
└────────┬────────────────────────┘
         │
    ┌────▼─────────┐
    │              │
    ▼              ▼
No Token      Token Found
    │              │
    │              ▼
    │        ┌─────────────────┐
    │        │ GET /auth/me    │
    │        └────┬──────┬─────┘
    │             │      │
    │             │   Error (401)
    │             │      │
    │        Valid│      ├─ Clear token
    │             │      └─ Mark as logged out
    │             │
    ▼             ▼
┌────────────────────────┐
│ isInitializing = false │
│ Hide LoadingSpinner    │
│ Show Router            │
└────────┬───────────────┘
         │
         ▼
    ┌────────────────────────┐
    │ User navigates route   │
    │ Guard checks auth      │
    └────┬──────┬───────┬────┘
         │      │       │
    Public│Auth? │Role?  │
         │      │       │
    ┌────▼─┐┌───▼──┐┌──▼────┐
    │Allow ││Redir ││Redir  │
    │     ││/login│└/un... │
    └──┬──┘└──┬───┘└───┬───┘
       │      │        │
       ▼      ▼        ▼
    ┌──────────────────────────┐
    │ Show Page / Redirect     │
    └──────────────────────────┘
```

## 🛡️ Security Features

✅ JWT tokens stored in localStorage (can be upgraded to HttpOnly cookies)
✅ 401 auto-logout on token expiration
✅ Role-based access control enforced
✅ Token validation on app load
✅ XSS protection via React context
✅ CSRF protection via backend (add if needed)

## ⚠️ Common Issues

### Issue: Always redirected to login

**Fix:** Check backend `/auth/me` is returning correct user

### Issue: Token not persisting on refresh

**Fix:** Ensure token saved in localStorage, check backend returns 200 not 401

### Issue: Can access pages without login

**Fix:** Verify route is wrapped with correct guard component

### Issue: Wrong role can access admin pages

**Fix:** Check `requiredRoles` prop includes correct role

## 📚 Files Reference

```
src/
├── store/authStore.ts                ← Auth state & methods
├── services/authService.ts           ← API calls
├── routes/
│   ├── ProtectedRoute.tsx           ← Auth required
│   ├── PublicRoute.tsx              ← No auth required
│   ├── RoleProtectedRoute.tsx       ← Role required
│   └── router.tsx                   ← All routes configured
├── pages/
│   └── Unauthorized.tsx             ← Error page
├── hooks/
│   └── useAuthInitializer.ts        ← Init on mount
├── components/ui/
│   └── LoadingSpinner.tsx           ← Loading state
└── App.tsx                          ← Integration point
```

## 🧪 Testing Commands

```bash
# Test unauthenticated access
curl -X GET http://localhost:5173/admin/dashboard
# Should redirect to /login

# Test token validation
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should return user data

# Test logout
curl -X POST http://localhost:8000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should return success message
```

## 🎓 Key Concepts

**isInitializing**

- True while checking localStorage + /auth/me
- False when auth check complete
- Used to show LoadingSpinner

**isAuthenticated**

- True if user has valid token
- False if no token or 401 response
- Used by guards to redirect

**requiredRoles**

- Array of roles allowed to access route
- Checked against user.role
- If no match → redirect to /unauthorized

**PublicRoute**

- For unauthenticated pages (login, register)
- If user authenticated → redirect to dashboard
- If user not authenticated → show page

**ProtectedRoute**

- For authenticated-only pages
- If not authenticated → redirect to /login
- If authenticated → show page

**RoleProtectedRoute**

- For role-specific pages (admin, employee, client)
- If not authenticated → redirect to /login
- If wrong role → redirect to /unauthorized
- If correct role → show page

---

**All routes are now protected! 🔒**
