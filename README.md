# SaaS Platform

A full-stack SaaS dashboard platform with role-based portals for admins, employees, and clients.

## Tech Stack

- Backend: Laravel, JWT Auth, PHPUnit
- Frontend: React, TypeScript, Vite, Tailwind CSS
- UI: Lucide icons, Recharts, Framer Motion
- Auth: JWT access/refresh tokens with role-based routing

## Main Features

- Admin dashboard with analytics, projects, tasks, employees, clients, reports, notifications, and activity logs
- Employee dashboard with task updates, productivity insights, comments, files, and notifications
- Client portal with projects, reports, files, and recent updates
- Role-based global search
- Task collaboration with comments and file attachments
- Activity log timeline with filters, search, pagination, and admin clear action
- Profile settings with avatar upload
- Invite and password reset flows

## Project Structure

```text
Saas-Platform/
  backend/    Laravel API
  frontend/   React + Vite app
```

## Requirements

- PHP 8.3+
- Composer
- Node.js
- npm
- SQLite by default, or another database configured in `backend/.env`

## Backend Setup

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan jwt:secret
php artisan migrate
php artisan storage:link
php artisan serve
```

The API runs by default at:

```text
http://127.0.0.1:8000/api
```

## Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Make sure `frontend/.env` points to the backend API:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

The frontend usually runs at:

```text
http://127.0.0.1:5173
```

## Testing and Validation

Backend:

```bash
cd backend
php artisan test
```

Frontend:

```bash
cd frontend
npm run lint
npx tsc --noEmit -p tsconfig.json
npm run build
```

## Common Development Commands

Backend:

```bash
php artisan serve
php artisan migrate
php artisan test
php artisan route:list
```

Frontend:

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Environment Notes

- Backend mail defaults to the Laravel `log` mailer in `.env.example`.
- Backend storage defaults to local disk; run `php artisan storage:link` for public uploads.
- JWT requires `JWT_SECRET`, generated with `php artisan jwt:secret`.
- Frontend API requests use `VITE_API_URL`.

## Production Checklist

- Set secure `APP_KEY` and `JWT_SECRET`.
- Configure production database credentials.
- Configure mail provider for invites and password resets.
- Configure file storage for avatars, reports, and task attachments.
- Run migrations.
- Build the frontend with `npm run build`.
- Run `php artisan config:cache`, `php artisan route:cache`, and `php artisan view:cache` as appropriate.

