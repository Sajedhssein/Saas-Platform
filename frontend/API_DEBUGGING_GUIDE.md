# API Connection Debugging Guide

## Quick Debug Steps

### 1. Start the Development Servers

**Terminal 1 - Backend (Laravel)**

```bash
cd C:\Users\User\OneDrive\Desktop\backend
php artisan serve --port=8000
```

Verify it's running: Visit http://127.0.0.1:8000 in browser

**Terminal 2 - Frontend (Vite)**

```bash
cd C:\Users\User\OneDrive\Desktop\frontend
npm run dev
```

Frontend runs at http://localhost:5173

### 2. Test API Connection in Browser

1. Open http://localhost:5173 in browser
2. Press `F12` to open DevTools
3. Go to **Console** tab
4. Type: `testAPI()` and press Enter
5. Check the output messages

### 3. Check Network Requests

1. In DevTools, go to **Network** tab
2. Reload page
3. Look for requests to `/api/`
4. Click on any API request and check:
   - **Headers** tab: See request headers and URL
   - **Response** tab: See server response
   - **Status**: Should be 200, not 404 or 500

## Common Issues & Solutions

### Issue: CORS Error

**Error in console:** `Access to XMLHttpRequest from origin 'http://localhost:5173' has been blocked by CORS policy`

**Solution:**

1. Go to Laravel backend: `config/cors.php`
2. Add your frontend URL:

```php
'allowed_origins' => [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
],
```

3. Restart Laravel backend

### Issue: 404 Not Found

**Error:** `GET http://127.0.0.1:8000/api/tasks 404`

**Solution:**

1. Check Laravel routes are defined in `routes/api.php`
2. Verify route exists:

```bash
php artisan route:list | grep tasks
```

3. If missing, add routes to backend

### Issue: Connection Refused

**Error:** `Connection refused` or `net::ERR_CONNECTION_REFUSED`

**Solution:**

1. Verify backend is running: `http://127.0.0.1:8000`
2. Check port is 8000 (not 8001 or other)
3. Restart backend server

### Issue: 500 Internal Server Error

**Error:** `GET http://127.0.0.1:8000/api/tasks 500`

**Solution:**

1. Check Laravel logs: `storage/logs/laravel.log`
2. Look for error message
3. Fix the backend issue

### Issue: Token/Authorization Problems

**Error:** `401 Unauthorized`

**Solution:**

1. Login first to get token
2. Token stored in localStorage (DevTools > Application > Local Storage)
3. Token should appear in requests as: `Authorization: Bearer {token}`
4. Check token format in browser DevTools Network tab

## Environment Variables

**File:** `.env`

```
VITE_API_URL=http://127.0.0.1:8000/api
```

For Vite proxy (dev only):

- Frontend listens on `http://localhost:5173`
- Vite proxy redirects `/api` requests to `http://127.0.0.1:8000/api`

## Backend Configuration Checklist

✅ Laravel running on port 8000
✅ CORS enabled and allows frontend origin
✅ API routes exist in `routes/api.php`
✅ Authentication middleware configured
✅ Database migrations run (if needed)

## Testing Endpoints Manually

### Using Browser Console

```javascript
// Get all tasks
await fetch("http://127.0.0.1:8000/api/tasks")
  .then((r) => r.json())
  .then((d) => console.log(d));

// Post new task (if authenticated)
await fetch("http://127.0.0.1:8000/api/tasks", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
  body: JSON.stringify({ title: "Test" }),
});
```

## Log Messages to Look For

**Success:**

```
✅ /api/tasks accessible: 200
✅ Backend is responding!
```

**Failure:**

```
❌ /api/tasks error: 404 Not Found
❌ /api/tasks error: 0 (Connection refused)
```

## Need More Help?

Check:

1. Laravel error logs: `storage/logs/laravel.log`
2. Browser console: `F12 > Console`
3. Network tab: `F12 > Network > XHR`
4. Run `testAPI()` in console for diagnostics
