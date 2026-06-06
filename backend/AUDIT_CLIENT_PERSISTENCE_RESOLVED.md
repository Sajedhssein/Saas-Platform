# CRITICAL CLIENT STATUS PERSISTENCE AUDIT - REPORT

## Issue Summary

Client edit modal allows selecting Active/Inactive status. Frontend reports success. However:

- Client badge remains Active (not updated)
- Analytics counts do not change
- Page refresh still shows Active

**Root Cause**: The `#[Fillable]` attribute on the User model was **overriding** the `protected $fillable` property, preventing `is_active` from being mass-assigned.

---

## Audit Results

### 1. Database Schema ✓

- Migration `2026_06_03_000001_add_is_active_to_users_table` applied (Batch 11)
- Column exists: `users.is_active` (boolean, default true)

### 2. Model Configuration ✗ FOUND ISSUE

**Before Fix:**

```php
#[Fillable(['name', 'email', 'password'])]  // ← OVERRIDING $fillable property!
protected $fillable = [
    'company_id', 'name', 'email', 'password',
    'avatar_url', 'department', 'position', 'status',
    'is_active',  // ← This was being ignored!
    'phone',
];
```

The `#[Fillable]` attribute (PHP 8 syntax) was overriding the property, restricting fillable to only ['name', 'email', 'password'].

**After Fix:**
Removed the conflicting `#[Fillable]` attribute. The `protected $fillable` array now applies correctly.

### 3. Persistence Testing ✓

Test payload: `{"is_active": false}`

| Step                     | Value                | Status           |
| ------------------------ | -------------------- | ---------------- |
| Before update            | true                 | ✓ Correct        |
| After fill (before save) | false                | ✓ Correct        |
| Dirty attributes         | {"is_active": false} | ✓ Correct        |
| Save returned            | true                 | ✓ Success        |
| DB after update          | false                | ✓ Persisted      |
| Model after refresh      | false                | ✓ Cast correctly |
| Reverse test (activate)  | true                 | ✓ Persisted      |

### 4. Test Coverage ✓

- `tests/Feature/Admin/UserManagementTest.php`: 26 tests passing
- `tests/Feature/Admin/DashboardAnalyticsTest.php`: 21 tests passing
- **Total: 47 tests passing with 200 assertions**

---

## Fix Applied

**File**: [app/Models/User.php](app/Models/User.php)

```diff
- #[Fillable(['name', 'email', 'password'])]
  #[Hidden(['password', 'remember_token'])]
  class User extends Authenticatable implements JWTSubject
```

**Why this works:**

- Removes conflicting attribute
- `protected $fillable` property is now the source of truth
- `is_active` is now mass-assignable
- Boolean casting still works correctly

---

## Verification Checklist

✓ Database column exists: `is_active`  
✓ Migration applied successfully  
✓ Model fillable array includes `is_active`  
✓ Request validation works: `'is_active' => 'sometimes|boolean'`  
✓ Controller fill/save works correctly  
✓ Database persistence confirmed  
✓ Boolean casting works (false/true, not 0/1)  
✓ Analytics calculate from `is_active`  
✓ UserResource includes `is_active` in response  
✓ All tests pass (47/47)

---

## Client Update Flow (Now Working)

1. **Frontend**: Sends `{"is_active": false}` (or true)
2. **Controller** `app/Http/Controllers/Api/Admin/ClientController@update`:
    - Validates scoping & role
    - Calls `$client->fill($request->validated())`
    - Calls `$client->save()`
3. **Request** `UpdateClientRequest`:
    - Validates: `'is_active' => 'sometimes|boolean'`
4. **Model** `User::fill()`:
    - `is_active` now mass-assignable ✓
    - Fill attribute into model
5. **Save**:
    - Persists to database
    - Cast as boolean
6. **Response**:
    - Returns `UserResource` with `is_active` field
    - Frontend updates UI with persisted value
7. **Refresh**:
    - Page loads fresh data showing updated `is_active`
8. **Analytics**:
    - `DashboardController::clientAnalytics()` queries `users.is_active`
    - Counts update correctly

---

## Implementation Complete

**What Changed:**

- ✓ Removed `#[Fillable]` attribute from User model
- ✓ is_active field now properly fillable
- ✓ Persistence confirmed working
- ✓ All tests passing

**What Works Now:**

- ✓ Client activation/deactivation persists
- ✓ Page refresh shows correct status
- ✓ Analytics counts reflect is_active state
- ✓ Badge and UI update correctly

---

## Test Results

```
PASS  Tests\Feature\Admin\UserManagementTest (26 tests)
✓ activate client
✓ deactivate client
✓ update client returns updated client
✓ (23 other tests)

PASS  Tests\Feature\Admin\DashboardAnalyticsTest (21 tests)
✓ active and inactive client counts use is active flag
✓ (20 other tests)

Tests:    47 passed (200 assertions)
Duration: 6.10s
```

---

**Date**: 2026-06-03  
**Status**: ✓ RESOLVED AND VERIFIED
