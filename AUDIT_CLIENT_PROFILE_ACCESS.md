# CLIENT PROFILE ACCESS AUDIT - REPORT

## Summary

**Status**: ✓ **CLIENTS CAN ACCESS PROFILE** (No issue found)

Client profile access works correctly. All roles (admin, employee, client) can access their own profile endpoint.

---

## Route Configuration

| Component         | Details                                                |
| ----------------- | ------------------------------------------------------ |
| **Endpoint**      | `GET /api/profile` (read), `PUT /api/profile` (update) |
| **Middleware**    | `['auth:api', 'active']`                               |
| **Controller**    | `Api\ProfileController`                                |
| **Authorization** | None (all authenticated active users allowed)          |

---

## Middleware Chain

### 1. `auth:api` (JWT Authentication)

- **Handler**: Laravel's default JWT guard
- **Effect**: Requires valid JWT token in Authorization header
- **Blocks**: Unauthenticated requests (401 Unauthorized)

### 2. `active` → EnsureUserIsActive Middleware

- **File**: [app/Http/Middleware/EnsureUserIsActive.php](app/Http/Middleware/EnsureUserIsActive.php)
- **Checks**:
    - User must be authenticated ✓
    - User status must be `'active'` (not `'inactive'`)
    - Token must not be revoked
- **Blocks**: Inactive users (403 Account inactive)

### 3. ProfileController

- **File**: [app/Http/Controllers/Api/ProfileController.php](app/Http/Controllers/Api/ProfileController.php)
- **Method**: `show()`
    - Returns `auth()->user()` profile data
    - No role checks
    - No authorization policies
- **Method**: `update(UpdateProfileRequest $request)`
    - Validates: name, email (required), phone/department/position (optional)
    - Updates `auth()->user()`
    - Returns fresh profile data

---

## Access Control Matrix

| Role            | Status   | Can Access /api/profile (GET) | Can Access /api/profile (PUT) |
| --------------- | -------- | ----------------------------- | ----------------------------- |
| Admin           | active   | ✓ 200 OK                      | ✓ 200 OK                      |
| Employee        | active   | ✓ 200 OK                      | ✓ 200 OK                      |
| Client          | active   | ✓ 200 OK                      | ✓ 200 OK                      |
| Any role        | inactive | ✗ 403 Forbidden               | ✗ 403 Forbidden               |
| Unauthenticated | -        | ✗ 401 Unauthorized            | ✗ 401 Unauthorized            |

---

## Test Results

```
PASS  Tests\Feature\ProfileAccessTest
✓ admin can access profile
✓ employee can access profile
✓ client can access profile            ← CLIENT PROFILE WORKS
✓ inactive user cannot access profile
✓ unauthenticated cannot access profile

Tests: 5 passed
```

---

## Why Clients Don't Get 403

1. **Route registered correctly** - Profile route exists and applies correct middleware
2. **Middleware configured correctly** - 'active' maps to EnsureUserIsActive
3. **No role restrictions** - ProfileController has no `@authorize` or role checks
4. **Status defaults to 'active'** - Users created via factory or UserCreationService get status='active'
5. **No policies** - AppServiceProvider has no policy for User/Profile model

---

## Possible 403 Sources

If a client DOES receive 403, check:

1. **User account is inactive** - Check `users.status` in database

    ```php
    User::where('id', $client_id)->first()->status;  // Should be 'active'
    ```

2. **Token is revoked** - Check `users.token_invalidated_at`

    ```php
    User::where('id', $client_id)->first()->token_invalidated_at;  // Should be null
    ```

3. **Different endpoint** - Is it actually `/api/profile` or a different endpoint?
    - `/api/admin/clients/{client}` → Requires admin role
    - `/api/admin/profile` → Does not exist

4. **Custom middleware** - Check if other middleware is applied elsewhere

---

## Database Values for Active Client

```
id:        019e8e03-c87a-7386-80a4-d1bd6564fcf2
name:      Client User
email:     client@example.com
status:    'active'             ← Required for access
is_active: true|false           ← Used for admin analytics (not middleware)
```

---

## Recommendation

**No changes needed** - Profile access for clients works correctly.

If users are receiving 403, verify:

1. `SELECT status FROM users WHERE email = 'client@email.com';` → Should be 'active'
2. Check browser network tab for actual endpoint being called
3. Verify JWT token is valid and not expired

---

## Files Involved

| File                                                                                                     | Purpose                           |
| -------------------------------------------------------------------------------------------------------- | --------------------------------- |
| [routes/api.php](routes/api.php)                                                                         | Profile routes with middleware    |
| [app/Http/Controllers/Api/ProfileController.php](app/Http/Controllers/Api/ProfileController.php)         | Profile data retrieval and update |
| [app/Http/Middleware/EnsureUserIsActive.php](app/Http/Middleware/EnsureUserIsActive.php)                 | Blocks inactive users             |
| [app/Http/Requests/Profile/UpdateProfileRequest.php](app/Http/Requests/Profile/UpdateProfileRequest.php) | Profile update validation         |
| [bootstrap/app.php](bootstrap/app.php)                                                                   | Middleware alias configuration    |

---

**Date**: 2026-06-03  
**Status**: ✓ AUDIT COMPLETE - NO ISSUES FOUND
