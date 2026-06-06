# Frontend-Backend Connection Setup

## Configuration

### Environment Variables

The frontend is configured to connect to the Laravel backend on `http://127.0.0.1:8000/api`.

**File:** `.env`

```
VITE_API_URL=http://127.0.0.1:8000/api
```

### How It Works

1. **Axios Instance** (`src/api/axios.ts`)
   - Base URL automatically reads from `VITE_API_URL` environment variable
   - Includes request interceptor to add Bearer token from localStorage
   - Response interceptor handles 401 errors (auto-redirect to login)
   - CORS enabled with `withCredentials: true`

2. **API Services** (`src/services/`)
   - `authService.ts` - Authentication endpoints
   - `taskService.ts` - Task management endpoints
   - `projectService.ts` - Project management endpoints

3. **Authentication Flow**
   - Login endpoint: `POST /api/auth/login`
   - Token stored in localStorage as `token`
   - Auto-attached to all requests as `Authorization: Bearer {token}`
   - Auto-logout on 401 response

## Running Frontend & Backend Together

### Option 1: Terminal Tabs

```bash
# Terminal 1 - Backend
cd C:\Users\User\OneDrive\Desktop\backend
php artisan serve

# Terminal 2 - Frontend
cd C:\Users\User\OneDrive\Desktop\frontend
npm run dev
```

### Option 2: Using npm concurrently

Install concurrently:

```bash
npm install --save-dev concurrently
```

Then add to `package.json`:

```json
"scripts": {
  "dev": "vite",
  "dev:full": "concurrently \"cd ../backend && php artisan serve\" \"vite\"",
  "build": "tsc -b && vite build"
}
```

## Laravel Backend Configuration

### CORS Setup in Laravel

Ensure your Laravel backend has CORS enabled in `config/cors.php`:

```php
'allowed_origins' => ['http://localhost:5173', 'http://127.0.0.1:5173'],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => true,
```

### API Endpoints Expected

**Authentication**

- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

**Tasks**

- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/{id}` - Get task by ID
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

**Projects**

- `GET /api/projects` - Get all projects
- `GET /api/projects/{id}` - Get project by ID
- `POST /api/projects` - Create project
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

## Testing the Connection

1. Start Laravel backend on port 8000
2. Start frontend development server
3. Open http://localhost:5173
4. Try to login (any credentials for testing)
5. Check browser DevTools Network tab to see API calls to http://127.0.0.1:8000/api

## Troubleshooting

**CORS Error?**

- Verify Laravel CORS config allows frontend origin
- Check `config/cors.php` in backend

**401 Unauthorized?**

- Token may have expired
- Clear localStorage and login again
- Check token is being sent in Authorization header (DevTools > Network > Request Headers)

**API not responding?**

- Verify backend is running on port 8000
- Check `VITE_API_URL` in `.env`
- Verify API endpoints match your Laravel routes

## Production Setup

For production, update `.env`:

```
VITE_API_URL=https://api.yourdomain.com/api
```

Then rebuild:

```bash
npm run build
```
