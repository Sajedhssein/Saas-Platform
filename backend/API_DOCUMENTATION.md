# Laravel SaaS Backend API Documentation

**API Version:** 1.0.0  
**Last Updated:** May 15, 2026  
**Base URL:** `https://api.yourdomain.com/api`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Admin Dashboard](#admin-dashboard)
4. [Projects Management](#projects-management)
5. [Tasks Management](#tasks-management)
6. [Task Files (Azure Blob Storage)](#task-files-azure-blob-storage)
7. [Task Responses](#task-responses)
8. [Task Comments](#task-comments)
9. [Employee Management](#employee-management)
10. [Client Portal](#client-portal)
11. [Notifications](#notifications)
12. [Reports](#reports)
13. [Activity Logs](#activity-logs)
14. [Global Date Filtering System](#global-date-filtering-system)
15. [System Architecture Overview](#system-architecture-overview)
16. [Common Response Formats](#common-response-formats)

---

## Overview

This API provides comprehensive project and task management functionality for a multi-tenant SaaS platform. The system implements:

- **JWT-based authentication** with token refresh
- **Role-based access control (RBAC)** with role middleware
- **Company isolation** for multi-tenancy
- **Activity logging** for audit trails
- **Real-time notifications** for task events
- **Azure Blob Storage** integration for file management
- **Advanced reporting** with date filtering
- **Flexible date range filtering** system

### Supported Roles

- `admin` - Full access to company management and all resources
- `employee` - Limited access to assigned tasks and projects
- `client` - Read-only access to company projects and files
- `super_admin` - System-wide access (cannot be assigned by admins)

---

## Authentication

### Register Company Admin

**Method:** `POST`

**URL:** `/auth/register`

**Authentication:** Public (No token required)

**Authorization:** N/A

**Headers:**

```json
{
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Request Body:**

```json
{
    "company_name": "Acme Corporation",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@acme.com",
    "password": "SecurePass123"
}
```

**Validation Rules:**

- `company_name` - required, string, max 255 characters
- `first_name` - required, string, max 255 characters
- `last_name` - required, string, max 255 characters
- `email` - required, valid email format, unique in users table
- `password` - required, minimum 8 characters, must contain letters and numbers

**Success Response:** `201 Created`

```json
{
    "success": true,
    "message": "Company and admin user registered successfully.",
    "data": {
        "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "token_type": "bearer",
        "expires_in": 3600,
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "company_id": "550e8400-e29b-41d4-a716-446655440001",
            "name": "John Doe",
            "email": "john.doe@acme.com",
            "phone": null,
            "position": null,
            "status": "active",
            "roles": ["admin"]
        }
    }
}
```

**Error Responses:**

| Status | Error                | Reason                      |
| ------ | -------------------- | --------------------------- |
| 422    | Validation Error     | Invalid input data          |
| 409    | Email Already Exists | Email is already registered |

---

### Login

**Method:** `POST`

**URL:** `/auth/login`

**Authentication:** Public (No token required)

**Authorization:** N/A

**Headers:**

```json
{
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Request Body:**

```json
{
    "email": "john.doe@acme.com",
    "password": "SecurePass123"
}
```

**Validation Rules:**

- `email` - required, valid email format
- `password` - required, string

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "Authentication successful.",
    "data": {
        "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "token_type": "bearer",
        "expires_in": 3600,
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "company_id": "550e8400-e29b-41d4-a716-446655440001",
            "name": "John Doe",
            "email": "john.doe@acme.com",
            "phone": null,
            "position": null,
            "status": "active",
            "roles": ["admin"]
        }
    }
}
```

**Error Responses:**

| Status | Error               | Reason                         |
| ------ | ------------------- | ------------------------------ |
| 401    | Invalid Credentials | Email or password is incorrect |

---

### Logout

**Method:** `POST`

**URL:** `/auth/logout`

**Authentication:** JWT Bearer Token required

**Authorization:** All authenticated users

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Request Body:** Empty

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "Logged out successfully."
}
```

**Error Responses:**

| Status | Error        | Reason                   |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token missing or invalid |

---

### Get Current User

**Method:** `GET`

**URL:** `/auth/me`

**Authentication:** JWT Bearer Token required

**Authorization:** All authenticated users

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

```json
{
    "success": true,
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "company_id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "John Doe",
        "email": "john.doe@acme.com",
        "phone": "555-0100",
        "position": "Manager",
        "status": "active",
        "roles": ["admin"]
    }
}
```

**Error Responses:**

| Status | Error        | Reason                   |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token missing or invalid |

---

### Refresh Token

**Method:** `POST`

**URL:** `/auth/refresh`

**Authentication:** JWT Bearer Token required

**Authorization:** All authenticated users

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Request Body:** Empty

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "Authentication successful.",
    "data": {
        "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "token_type": "bearer",
        "expires_in": 3600,
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "company_id": "550e8400-e29b-41d4-a716-446655440001",
            "name": "John Doe",
            "email": "john.doe@acme.com",
            "phone": null,
            "position": null,
            "status": "active",
            "roles": ["admin"]
        }
    }
}
```

**Error Responses:**

| Status | Error        | Reason                   |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token missing or invalid |

---

## Admin Dashboard

### Get Dashboard Statistics

**Method:** `GET`

**URL:** `/dashboard/stats`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter    | Type   | Description                                            |
| ------------ | ------ | ------------------------------------------------------ |
| `range`      | string | Date range filter: `today`, `week`, `month` (optional) |
| `start_date` | date   | Custom start date in YYYY-MM-DD format (optional)      |
| `end_date`   | date   | Custom end date in YYYY-MM-DD format (optional)        |

**Success Response:** `200 OK`

```json
{
    "total_projects": 15,
    "total_tasks": 87,
    "total_users": 25,
    "active_tasks": 42,
    "completed_tasks": 38,
    "overdue_tasks": 7,
    "task_completion_percentage": 43.68,
    "delayed_tasks_count": 3,
    "delayed_tasks": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440022",
            "project_id": "550e8400-e29b-41d4-a716-446655440010",
            "title": "Backend API Development",
            "status": "pending",
            "deadline": "2026-05-10T23:59:59Z",
            "created_at": "2026-05-01T10:30:00Z"
        }
    ],
    "project_progress_overview": [
        {
            "project_id": "550e8400-e29b-41d4-a716-446655440010",
            "project_name": "Website Redesign",
            "total_tasks": 12,
            "completed_tasks": 5,
            "progress_percentage": 41.67
        }
    ]
}
```

**Error Responses:**

| Status | Error        | Reason                   |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token missing or invalid |
| 403    | Forbidden    | Only admins can access   |

---

### Get Workload Analytics

**Method:** `GET`

**URL:** `/dashboard/workload`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

```json
{
    "employee_workloads": [
        {
            "employee_id": "550e8400-e29b-41d4-a716-446655440002",
            "employee_name": "Jane Smith",
            "total_assigned_tasks": 10,
            "pending_tasks": 2,
            "in_progress_tasks": 3,
            "completed_tasks": 5
        }
    ]
}
```

**Error Responses:**

| Status | Error        | Reason                   |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token missing or invalid |
| 403    | Forbidden    | Only admins can access   |

---

### Get Performance Analytics

**Method:** `GET`

**URL:** `/dashboard/performance`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

```json
{
    "employee_performance": [
        {
            "employee_id": "550e8400-e29b-41d4-a716-446655440002",
            "employee_name": "Jane Smith",
            "completed_tasks": 20,
            "overdue_tasks": 1,
            "completion_rate": 80.0,
            "average_completion_time": 3.5
        }
    ]
}
```

**Error Responses:**

| Status | Error        | Reason                   |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token missing or invalid |
| 403    | Forbidden    | Only admins can access   |

---

## Projects Management

### List Projects

**Method:** `GET`

**URL:** `/admin/projects`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter    | Type    | Description                                                        |
| ------------ | ------- | ------------------------------------------------------------------ |
| `status`     | string  | Filter by status: `pending`, `in_progress`, `completed` (optional) |
| `search`     | string  | Search by project name or description (optional)                   |
| `page`       | integer | Pagination page number (default: 1)                                |
| `range`      | string  | Date range filter: `today`, `week`, `month` (optional)             |
| `start_date` | date    | Custom start date in YYYY-MM-DD format (optional)                  |
| `end_date`   | date    | Custom end date in YYYY-MM-DD format (optional)                    |

**Success Response:** `200 OK`

```json
{
    "success": true,
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440010",
            "company_id": "550e8400-e29b-41d4-a716-446655440001",
            "created_by": "550e8400-e29b-41d4-a716-446655440000",
            "creator": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "John Doe",
                "email": "john.doe@acme.com"
            },
            "name": "Website Redesign",
            "description": "Complete redesign of company website",
            "status": "in_progress",
            "start_date": "2026-05-01",
            "end_date": "2026-06-30",
            "progress": 65,
            "budget": "50000.00",
            "created_at": "2026-05-01T10:30:00Z",
            "updated_at": "2026-05-15T14:20:00Z"
        }
    ],
    "meta": {
        "current_page": 1,
        "last_page": 2,
        "per_page": 15,
        "total": 25
    }
}
```

**Error Responses:**

| Status | Error        | Reason                        |
| ------ | ------------ | ----------------------------- |
| 401    | Unauthorized | Token missing or invalid      |
| 403    | Forbidden    | Only admins can list projects |

---

### Create Project

**Method:** `POST`

**URL:** `/admin/projects`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Request Body:**

```json
{
    "name": "Mobile App Development",
    "description": "Development of iOS and Android mobile applications",
    "status": "pending",
    "start_date": "2026-06-01",
    "end_date": "2026-12-31",
    "progress": 0,
    "budget": 150000.0
}
```

**Validation Rules:**

- `name` - required, string, max 255 characters
- `description` - nullable, string
- `status` - nullable, string, max 50 characters
- `start_date` - nullable, valid date format
- `end_date` - nullable, valid date format, must be >= start_date
- `progress` - nullable, integer, between 0-100
- `budget` - nullable, numeric, minimum 0

**Success Response:** `201 Created`

```json
{
    "success": true,
    "message": "Project created successfully.",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440011",
        "company_id": "550e8400-e29b-41d4-a716-446655440001",
        "created_by": "550e8400-e29b-41d4-a716-446655440000",
        "creator": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "John Doe",
            "email": "john.doe@acme.com"
        },
        "name": "Mobile App Development",
        "description": "Development of iOS and Android mobile applications",
        "status": "pending",
        "start_date": "2026-06-01",
        "end_date": "2026-12-31",
        "progress": 0,
        "budget": "150000.00",
        "created_at": "2026-05-15T14:30:00Z",
        "updated_at": "2026-05-15T14:30:00Z"
    }
}
```

**Error Responses:**

| Status | Error            | Reason                          |
| ------ | ---------------- | ------------------------------- |
| 401    | Unauthorized     | Token missing or invalid        |
| 403    | Forbidden        | Only admins can create projects |
| 422    | Validation Error | Invalid input data              |

---

### Get Project Details

**Method:** `GET`

**URL:** `/admin/projects/{project_id}`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**URL Parameters:**

- `project_id` - UUID of the project

**Success Response:** `200 OK`

```json
{
    "success": true,
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "company_id": "550e8400-e29b-41d4-a716-446655440001",
        "created_by": "550e8400-e29b-41d4-a716-446655440000",
        "creator": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "John Doe",
            "email": "john.doe@acme.com"
        },
        "name": "Website Redesign",
        "description": "Complete redesign of company website",
        "status": "in_progress",
        "start_date": "2026-05-01",
        "end_date": "2026-06-30",
        "progress": 65,
        "budget": "50000.00",
        "created_at": "2026-05-01T10:30:00Z",
        "updated_at": "2026-05-15T14:20:00Z"
    }
}
```

**Error Responses:**

| Status | Error        | Reason                                     |
| ------ | ------------ | ------------------------------------------ |
| 401    | Unauthorized | Token missing or invalid                   |
| 403    | Forbidden    | Only admins can view projects              |
| 404    | Not Found    | Project not found or not in user's company |

---

### Update Project

**Method:** `PUT`

**URL:** `/admin/projects/{project_id}`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Request Body:**

```json
{
    "name": "Website Redesign - Updated",
    "description": "Updated website redesign project",
    "status": "completed",
    "progress": 100,
    "budget": 55000.0
}
```

**Validation Rules:** Same as Create Project

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "Project updated successfully.",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "company_id": "550e8400-e29b-41d4-a716-446655440001",
        "created_by": "550e8400-e29b-41d4-a716-446655440000",
        "creator": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "John Doe",
            "email": "john.doe@acme.com"
        },
        "name": "Website Redesign - Updated",
        "description": "Updated website redesign project",
        "status": "completed",
        "start_date": "2026-05-01",
        "end_date": "2026-06-30",
        "progress": 100,
        "budget": "55000.00",
        "created_at": "2026-05-01T10:30:00Z",
        "updated_at": "2026-05-15T15:00:00Z"
    }
}
```

**Error Responses:**

| Status | Error            | Reason                                     |
| ------ | ---------------- | ------------------------------------------ |
| 401    | Unauthorized     | Token missing or invalid                   |
| 403    | Forbidden        | Only admins can update projects            |
| 404    | Not Found        | Project not found or not in user's company |
| 422    | Validation Error | Invalid input data                         |

---

### Delete Project

**Method:** `DELETE`

**URL:** `/admin/projects/{project_id}`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "Project deleted successfully."
}
```

**Error Responses:**

| Status | Error        | Reason                                     |
| ------ | ------------ | ------------------------------------------ |
| 401    | Unauthorized | Token missing or invalid                   |
| 403    | Forbidden    | Only admins can delete projects            |
| 404    | Not Found    | Project not found or not in user's company |

---

## Tasks Management

### List Tasks

**Method:** `GET`

**URL:** `/admin/tasks`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter    | Type    | Description                                                        |
| ------------ | ------- | ------------------------------------------------------------------ |
| `project_id` | UUID    | Filter by project (optional)                                       |
| `status`     | string  | Filter by status: `pending`, `in_progress`, `completed` (optional) |
| `page`       | integer | Pagination page number (default: 1)                                |
| `range`      | string  | Date range filter: `today`, `week`, `month` (optional)             |
| `start_date` | date    | Custom start date in YYYY-MM-DD format (optional)                  |
| `end_date`   | date    | Custom end date in YYYY-MM-DD format (optional)                    |

**Success Response:** `200 OK`

```json
{
    "success": true,
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440020",
            "project_id": "550e8400-e29b-41d4-a716-446655440010",
            "project": {
                "id": "550e8400-e29b-41d4-a716-446655440010",
                "name": "Website Redesign"
            },
            "created_by": "550e8400-e29b-41d4-a716-446655440000",
            "creator": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "John Doe",
                "email": "john.doe@acme.com"
            },
            "title": "Design homepage mockups",
            "description": "Create responsive homepage mockups",
            "status": "in_progress",
            "priority": "high",
            "progress": 75,
            "deadline": "2026-05-20T23:59:59Z",
            "estimated_hours": 16,
            "assignees": [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440002",
                    "name": "Jane Smith",
                    "email": "jane.smith@acme.com",
                    "role": "designer"
                }
            ],
            "files": [],
            "created_at": "2026-05-01T10:30:00Z",
            "updated_at": "2026-05-15T14:20:00Z"
        }
    ],
    "meta": {
        "current_page": 1,
        "last_page": 1,
        "per_page": 15,
        "total": 1
    }
}
```

**Error Responses:**

| Status | Error        | Reason                     |
| ------ | ------------ | -------------------------- |
| 401    | Unauthorized | Token missing or invalid   |
| 403    | Forbidden    | Only admins can list tasks |

---

### Create Task

**Method:** `POST`

**URL:** `/admin/tasks`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Request Body:**

```json
{
    "project_id": "550e8400-e29b-41d4-a716-446655440010",
    "title": "Implement payment gateway",
    "description": "Integrate Stripe payment gateway",
    "status": "pending",
    "priority": "high",
    "progress": 0,
    "deadline": "2026-05-25",
    "estimated_hours": 24
}
```

**Validation Rules:**

- `project_id` - required, UUID format, must exist in projects table
- `title` - required, string, max 255 characters
- `description` - nullable, string
- `status` - nullable, string, in: `pending`, `in_progress`, `completed`
- `priority` - nullable, string, in: `low`, `medium`, `high`
- `progress` - nullable, integer, between 0-100
- `deadline` - nullable, valid date format
- `estimated_hours` - nullable, integer, minimum 0

**Success Response:** `201 Created`

```json
{
    "success": true,
    "message": "Task created successfully.",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440021",
        "project_id": "550e8400-e29b-41d4-a716-446655440010",
        "project": {
            "id": "550e8400-e29b-41d4-a716-446655440010",
            "name": "Website Redesign"
        },
        "created_by": "550e8400-e29b-41d4-a716-446655440000",
        "creator": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "John Doe",
            "email": "john.doe@acme.com"
        },
        "title": "Implement payment gateway",
        "description": "Integrate Stripe payment gateway",
        "status": "pending",
        "priority": "high",
        "progress": 0,
        "deadline": "2026-05-25T23:59:59Z",
        "estimated_hours": 24,
        "assignees": [],
        "files": [],
        "created_at": "2026-05-15T14:30:00Z",
        "updated_at": "2026-05-15T14:30:00Z"
    }
}
```

**Error Responses:**

| Status | Error            | Reason                                     |
| ------ | ---------------- | ------------------------------------------ |
| 401    | Unauthorized     | Token missing or invalid                   |
| 403    | Forbidden        | Only admins can create tasks               |
| 404    | Not Found        | Project not found or not in user's company |
| 422    | Validation Error | Invalid input data                         |

---

### Get Task Details

**Method:** `GET`

**URL:** `/admin/tasks/{task_id}`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

Same structure as List Tasks individual item

**Error Responses:**

| Status | Error        | Reason                                  |
| ------ | ------------ | --------------------------------------- |
| 401    | Unauthorized | Token missing or invalid                |
| 403    | Forbidden    | Only admins can view tasks              |
| 404    | Not Found    | Task not found or not in user's company |

---

### Assign Task to Employees

**Method:** `POST`

**URL:** `/admin/tasks/{task_id}/assign`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Request Body:**

```json
{
    "assignees": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440002",
            "role": "developer"
        },
        {
            "id": "550e8400-e29b-41d4-a716-446655440003",
            "role": "qa_tester"
        }
    ]
}
```

**Validation Rules:**

- `assignees` - required, array, minimum 1 item
- `assignees.*.id` - required, UUID format, distinct, must exist in users table
- `assignees.*.role` - nullable, string, max 50 characters

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "Task assignees updated successfully.",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440021",
        "project_id": "550e8400-e29b-41d4-a716-446655440010",
        "title": "Implement payment gateway",
        "assignees": [
            {
                "id": "550e8400-e29b-41d4-a716-446655440002",
                "name": "Jane Smith",
                "email": "jane.smith@acme.com",
                "role": "developer"
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440003",
                "name": "Bob Johnson",
                "email": "bob.johnson@acme.com",
                "role": "qa_tester"
            }
        ]
    }
}
```

**Error Responses:**

| Status | Error             | Reason                                              |
| ------ | ----------------- | --------------------------------------------------- |
| 401    | Unauthorized      | Token missing or invalid                            |
| 403    | Forbidden         | Only admins can assign tasks                        |
| 404    | Not Found         | Task not found                                      |
| 422    | Invalid Assignees | One or more assignees are invalid or not in company |

---

### Update Task Status

**Method:** `PATCH`

**URL:** `/admin/tasks/{task_id}/status`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Request Body:**

```json
{
    "status": "completed"
}
```

**Validation Rules:**

- `status` - required, string, in: `pending`, `in_progress`, `completed`

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "Task status updated successfully.",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440021",
        "title": "Implement payment gateway",
        "status": "completed",
        "progress": 100
    }
}
```

**Error Responses:**

| Status | Error            | Reason                             |
| ------ | ---------------- | ---------------------------------- |
| 401    | Unauthorized     | Token missing or invalid           |
| 403    | Forbidden        | Only admins can update task status |
| 404    | Not Found        | Task not found                     |
| 422    | Validation Error | Invalid status value               |

---

### Get Employee's Assigned Tasks

**Method:** `GET`

**URL:** `/tasks/assigned`

**Authentication:** JWT Bearer Token required

**Authorization:** All authenticated users

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter | Type    | Description                         |
| --------- | ------- | ----------------------------------- |
| `page`    | integer | Pagination page number (default: 1) |

**Success Response:** `200 OK`

```json
{
    "success": true,
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440020",
            "project_id": "550e8400-e29b-41d4-a716-446655440010",
            "project": {
                "id": "550e8400-e29b-41d4-a716-446655440010",
                "name": "Website Redesign"
            },
            "title": "Design homepage mockups",
            "status": "in_progress",
            "priority": "high",
            "progress": 75,
            "deadline": "2026-05-20T23:59:59Z",
            "assignees": [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440002",
                    "name": "Jane Smith",
                    "email": "jane.smith@acme.com",
                    "role": "designer"
                }
            ],
            "files": [],
            "created_at": "2026-05-01T10:30:00Z",
            "updated_at": "2026-05-15T14:20:00Z"
        }
    ],
    "meta": {
        "current_page": 1,
        "last_page": 1,
        "per_page": 15,
        "total": 1
    }
}
```

**Error Responses:**

| Status | Error        | Reason                   |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token missing or invalid |

---

### Get Task Details (Employee View)

**Method:** `GET`

**URL:** `/tasks/{task_id}`

**Authentication:** JWT Bearer Token required

**Authorization:** All authenticated users (must be assigned to task)

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

Same as Assigned Tasks item structure

**Error Responses:**

| Status | Error        | Reason                                 |
| ------ | ------------ | -------------------------------------- |
| 401    | Unauthorized | Token missing or invalid               |
| 404    | Not Found    | Task not found or not assigned to user |

---

## Task Files (Azure Blob Storage)

### Upload File to Task

**Method:** `POST`

**URL:** `/admin/tasks/{task_id}/files`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: multipart/form-data
```

**Form Data:**

| Field  | Type | Description               |
| ------ | ---- | ------------------------- |
| `file` | file | File to upload (required) |

**File Constraints:**

- Maximum size: 20 MB
- Allowed MIME types: jpg, jpeg, png, pdf, doc, docx, xls, xlsx, csv, zip, txt

**Success Response:** `201 Created`

```json
{
    "success": true,
    "message": "File uploaded successfully.",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440030",
        "task_id": "550e8400-e29b-41d4-a716-446655440021",
        "uploaded_by": "550e8400-e29b-41d4-a716-446655440000",
        "file_name": "requirements.pdf",
        "file_path": "https://yourstorage.blob.core.windows.net/tasks/550e8400-e29b-41d4-a716-446655440021/uuid_requirements.pdf",
        "file_type": "application/pdf",
        "file_size": 2048576,
        "uploaded_at": "2026-05-15T14:30:00Z"
    }
}
```

**Error Responses:**

| Status | Error            | Reason                              |
| ------ | ---------------- | ----------------------------------- |
| 401    | Unauthorized     | Token missing or invalid            |
| 403    | Forbidden        | Only admins can upload files        |
| 404    | Not Found        | Task not found                      |
| 422    | Validation Error | File is too large or invalid format |

---

### View Task File

**Method:** `GET`

**URL:** `/tasks/{task_id}/files/{file_id}`

**Authentication:** JWT Bearer Token required

**Authorization:** User must be assigned to task or admin

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

```json
{
    "success": true,
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440030",
        "task_id": "550e8400-e29b-41d4-a716-446655440021",
        "uploaded_by": "550e8400-e29b-41d4-a716-446655440000",
        "file_name": "requirements.pdf",
        "file_path": "https://yourstorage.blob.core.windows.net/tasks/550e8400-e29b-41d4-a716-446655440021/uuid_requirements.pdf",
        "file_type": "application/pdf",
        "file_size": 2048576,
        "uploaded_at": "2026-05-15T14:30:00Z"
    }
}
```

**Error Responses:**

| Status | Error        | Reason                                      |
| ------ | ------------ | ------------------------------------------- |
| 401    | Unauthorized | Token missing or invalid                    |
| 404    | Not Found    | File not found or task not assigned to user |

---

## Task Responses

### Submit Task Response

**Method:** `POST`

**URL:** `/tasks/{task_id}/responses`

**Authentication:** JWT Bearer Token required

**Authorization:** All authenticated users (must be assigned to task)

**Headers:**

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: multipart/form-data
```

**Form Data:**

| Field        | Type   | Description                         |
| ------------ | ------ | ----------------------------------- |
| `response`   | string | Response text (required)            |
| `attachment` | file   | Optional attachment file (optional) |

**Constraints:**

- `response` - required, string
- `attachment` - optional, file, max 20 MB, allowed formats: jpg, jpeg, png, pdf, doc, docx, xls, xlsx, csv, zip, txt

**Success Response:** `201 Created`

```json
{
    "success": true,
    "message": "Response submitted successfully.",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440040",
        "task_id": "550e8400-e29b-41d4-a716-446655440021",
        "user_id": "550e8400-e29b-41d4-a716-446655440002",
        "response": "Task completed. Payment gateway integration is working.",
        "status": "submitted",
        "attachment_url": "https://yourstorage.blob.core.windows.net/tasks/550e8400-e29b-41d4-a716-446655440021/responses/uuid_screenshot.png",
        "submitted_at": "2026-05-15T14:30:00Z"
    }
}
```

**Error Responses:**

| Status | Error            | Reason                                 |
| ------ | ---------------- | -------------------------------------- |
| 401    | Unauthorized     | Token missing or invalid               |
| 404    | Not Found        | Task not found or not assigned to user |
| 422    | Validation Error | Invalid response data                  |

---

### List Task Responses (Employee View)

**Method:** `GET`

**URL:** `/tasks/{task_id}/responses`

**Authentication:** JWT Bearer Token required

**Authorization:** All authenticated users (must be assigned to task)

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

```json
{
    "success": true,
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440040",
            "task_id": "550e8400-e29b-41d4-a716-446655440021",
            "user_id": "550e8400-e29b-41d4-a716-446655440002",
            "response": "Task completed. Payment gateway integration is working.",
            "status": "submitted",
            "attachment_url": "https://yourstorage.blob.core.windows.net/tasks/550e8400-e29b-41d4-a716-446655440021/responses/uuid_screenshot.png",
            "submitted_at": "2026-05-15T14:30:00Z"
        }
    ]
}
```

**Error Responses:**

| Status | Error        | Reason                                 |
| ------ | ------------ | -------------------------------------- |
| 401    | Unauthorized | Token missing or invalid               |
| 404    | Not Found    | Task not found or not assigned to user |

---

## Task Comments

### Add Comment to Task

**Method:** `POST`

**URL:** `/tasks/{task_id}/comments`

**Authentication:** JWT Bearer Token required

**Authorization:** All authenticated users (must be assigned to task or creator)

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Request Body:**

```json
{
    "content": "Please review the payment gateway implementation."
}
```

**Validation Rules:**

- `content` - required, string, minimum 1 character, maximum 5000 characters

**Success Response:** `201 Created`

```json
{
    "message": "Comment added successfully",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440050",
        "task_id": "550e8400-e29b-41d4-a716-446655440021",
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440002",
            "name": "Jane Smith",
            "email": "jane.smith@acme.com",
            "avatar_url": null
        },
        "content": "Please review the payment gateway implementation.",
        "is_edited": false,
        "edited_at": null,
        "created_at": "2026-05-15T14:30:00Z",
        "updated_at": "2026-05-15T14:30:00Z"
    }
}
```

**Error Responses:**

| Status | Error            | Reason                     |
| ------ | ---------------- | -------------------------- |
| 401    | Unauthorized     | Token missing or invalid   |
| 404    | Not Found        | Task not found             |
| 422    | Validation Error | Comment content is invalid |

---

### List Task Comments

**Method:** `GET`

**URL:** `/tasks/{task_id}/comments`

**Authentication:** JWT Bearer Token required

**Authorization:** All authenticated users (must be assigned to task or creator)

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter | Type    | Description                                |
| --------- | ------- | ------------------------------------------ |
| `sort`    | string  | Sort order: `newest` (default) or `oldest` |
| `page`    | integer | Pagination page number (default: 1)        |

**Success Response:** `200 OK`

```json
{
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440050",
            "task_id": "550e8400-e29b-41d4-a716-446655440021",
            "user": {
                "id": "550e8400-e29b-41d4-a716-446655440002",
                "name": "Jane Smith",
                "email": "jane.smith@acme.com",
                "avatar_url": null
            },
            "content": "Please review the payment gateway implementation.",
            "is_edited": false,
            "edited_at": null,
            "created_at": "2026-05-15T14:30:00Z",
            "updated_at": "2026-05-15T14:30:00Z"
        }
    ],
    "pagination": {
        "total": 1,
        "per_page": 15,
        "current_page": 1,
        "last_page": 1,
        "from": 1,
        "to": 1,
        "has_more": false
    }
}
```

**Error Responses:**

| Status | Error        | Reason                   |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token missing or invalid |
| 404    | Not Found    | Task not found           |

---

### Update Comment

**Method:** `PUT`

**URL:** `/comments/{comment_id}`

**Authentication:** JWT Bearer Token required

**Authorization:** Comment owner only

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Request Body:**

```json
{
    "content": "Updated: Please review the payment gateway implementation thoroughly."
}
```

**Validation Rules:**

- `content` - required, string, minimum 1 character, maximum 5000 characters

**Success Response:** `200 OK`

```json
{
    "message": "Comment updated successfully",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440050",
        "task_id": "550e8400-e29b-41d4-a716-446655440021",
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440002",
            "name": "Jane Smith",
            "email": "jane.smith@acme.com",
            "avatar_url": null
        },
        "content": "Updated: Please review the payment gateway implementation thoroughly.",
        "is_edited": true,
        "edited_at": "2026-05-15T15:00:00Z",
        "created_at": "2026-05-15T14:30:00Z",
        "updated_at": "2026-05-15T15:00:00Z"
    }
}
```

**Error Responses:**

| Status | Error            | Reason                        |
| ------ | ---------------- | ----------------------------- |
| 401    | Unauthorized     | Token missing or invalid      |
| 403    | Forbidden        | Only comment owner can update |
| 404    | Not Found        | Comment not found             |
| 422    | Validation Error | Invalid comment content       |

---

### Delete Comment

**Method:** `DELETE`

**URL:** `/comments/{comment_id}`

**Authentication:** JWT Bearer Token required

**Authorization:** Comment owner only

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `204 No Content`

**Error Responses:**

| Status | Error        | Reason                        |
| ------ | ------------ | ----------------------------- |
| 401    | Unauthorized | Token missing or invalid      |
| 403    | Forbidden    | Only comment owner can delete |
| 404    | Not Found    | Comment not found             |

---

## Employee Management

### Create Employee

**Method:** `POST`

**URL:** `/admin/employees`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Request Body:**

```json
{
    "name": "Alice Johnson",
    "email": "alice.johnson@acme.com",
    "password": "SecurePass123",
    "phone": "555-0101"
}
```

**Validation Rules:**

- `name` - required, string, max 255 characters
- `email` - required, valid email format, unique in users table
- `password` - required, minimum 8 characters, must contain letters and numbers
- `phone` - nullable, string, max 50 characters

**Success Response:** `201 Created`

```json
{
    "success": true,
    "message": "User created successfully.",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "company_id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Alice Johnson",
        "email": "alice.johnson@acme.com",
        "phone": "555-0101",
        "position": null,
        "status": "active",
        "roles": ["employee"]
    }
}
```

**Error Responses:**

| Status | Error            | Reason                                     |
| ------ | ---------------- | ------------------------------------------ |
| 401    | Unauthorized     | Token missing or invalid                   |
| 403    | Forbidden        | Only admins can create employees           |
| 422    | Validation Error | Invalid input data or email already exists |

---

### Create Client

**Method:** `POST`

**URL:** `/admin/clients`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Request Body:**

```json
{
    "name": "Bob Williams",
    "email": "bob.williams@client.com",
    "password": "SecurePass123",
    "company_name": "Client Company Inc",
    "phone": "555-0102"
}
```

**Validation Rules:**

- `name` - required, string, max 255 characters
- `email` - required, valid email format, unique in users table
- `password` - required, minimum 8 characters, must contain letters and numbers
- `company_name` - nullable, string, max 255 characters
- `phone` - nullable, string, max 50 characters

**Success Response:** `201 Created`

```json
{
    "success": true,
    "message": "User created successfully.",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440005",
        "company_id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Bob Williams",
        "email": "bob.williams@client.com",
        "phone": "555-0102",
        "position": null,
        "status": "active",
        "roles": ["client"]
    }
}
```

**Error Responses:**

| Status | Error            | Reason                                     |
| ------ | ---------------- | ------------------------------------------ |
| 401    | Unauthorized     | Token missing or invalid                   |
| 403    | Forbidden        | Only admins can create clients             |
| 422    | Validation Error | Invalid input data or email already exists |

---

### List Users

**Method:** `GET`

**URL:** `/admin/users`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter | Type    | Description                                              |
| --------- | ------- | -------------------------------------------------------- |
| `status`  | string  | Filter by status: `active`, `inactive` (optional)        |
| `role`    | string  | Filter by role: `admin`, `employee`, `client` (optional) |
| `page`    | integer | Pagination page number (default: 1)                      |

**Success Response:** `200 OK`

```json
{
    "success": true,
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "company_id": "550e8400-e29b-41d4-a716-446655440001",
            "name": "John Doe",
            "email": "john.doe@acme.com",
            "phone": null,
            "position": null,
            "status": "active",
            "roles": ["admin"]
        },
        {
            "id": "550e8400-e29b-41d4-a716-446655440002",
            "company_id": "550e8400-e29b-41d4-a716-446655440001",
            "name": "Jane Smith",
            "email": "jane.smith@acme.com",
            "phone": null,
            "position": null,
            "status": "active",
            "roles": ["employee"]
        }
    ],
    "meta": {
        "current_page": 1,
        "last_page": 1,
        "per_page": 15,
        "total": 2
    }
}
```

**Error Responses:**

| Status | Error        | Reason                     |
| ------ | ------------ | -------------------------- |
| 401    | Unauthorized | Token missing or invalid   |
| 403    | Forbidden    | Only admins can list users |

---

### Get User Details

**Method:** `GET`

**URL:** `/admin/users/{user_id}`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

```json
{
    "success": true,
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "company_id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Jane Smith",
        "email": "jane.smith@acme.com",
        "phone": null,
        "position": null,
        "status": "active",
        "roles": ["employee"]
    }
}
```

**Error Responses:**

| Status | Error        | Reason                                  |
| ------ | ------------ | --------------------------------------- |
| 401    | Unauthorized | Token missing or invalid                |
| 403    | Forbidden    | Only admins can view users              |
| 404    | Not Found    | User not found or not in user's company |

---

### Update User

**Method:** `PUT`

**URL:** `/admin/users/{user_id}`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Request Body:**

```json
{
    "name": "Jane Smith Updated",
    "phone": "555-0200",
    "position": "Senior Developer"
}
```

**Validation Rules:**

- `name` - nullable, string, max 255 characters
- `email` - nullable, valid email format, unique except for current user
- `phone` - nullable, string, max 50 characters
- `position` - nullable, string, max 255 characters

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "User updated successfully.",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "company_id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Jane Smith Updated",
        "email": "jane.smith@acme.com",
        "phone": "555-0200",
        "position": "Senior Developer",
        "status": "active",
        "roles": ["employee"]
    }
}
```

**Error Responses:**

| Status | Error            | Reason                                  |
| ------ | ---------------- | --------------------------------------- |
| 401    | Unauthorized     | Token missing or invalid                |
| 403    | Forbidden        | Only admins can update users            |
| 404    | Not Found        | User not found or not in user's company |
| 422    | Validation Error | Invalid input data                      |

---

### Assign Roles to User

**Method:** `PUT`

**URL:** `/admin/users/{user_id}/roles`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Request Body:**

```json
{
    "roles": ["employee", "manager"]
}
```

**Validation Rules:**

- `roles` - required, array, cannot include `super_admin`

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "User roles updated successfully.",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "company_id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Jane Smith",
        "email": "jane.smith@acme.com",
        "phone": null,
        "position": null,
        "status": "active",
        "roles": ["employee", "manager"]
    }
}
```

**Error Responses:**

| Status | Error        | Reason                                  |
| ------ | ------------ | --------------------------------------- |
| 401    | Unauthorized | Token missing or invalid                |
| 403    | Forbidden    | Cannot assign super_admin role          |
| 404    | Not Found    | User not found or not in user's company |

---

### Deactivate User

**Method:** `PATCH`

**URL:** `/admin/users/{user_id}/deactivate`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "User deactivated successfully."
}
```

**Error Responses:**

| Status | Error        | Reason                                  |
| ------ | ------------ | --------------------------------------- |
| 401    | Unauthorized | Token missing or invalid                |
| 403    | Forbidden    | Only admins can deactivate users        |
| 400    | Bad Request  | Cannot deactivate yourself              |
| 404    | Not Found    | User not found or not in user's company |

---

### Activate User

**Method:** `PATCH`

**URL:** `/admin/users/{user_id}/activate`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "User activated successfully.",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "company_id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Jane Smith",
        "email": "jane.smith@acme.com",
        "phone": null,
        "position": null,
        "status": "active",
        "roles": ["employee"]
    }
}
```

**Error Responses:**

| Status | Error        | Reason                                  |
| ------ | ------------ | --------------------------------------- |
| 401    | Unauthorized | Token missing or invalid                |
| 403    | Forbidden    | Only admins can activate users          |
| 404    | Not Found    | User not found or not in user's company |

---

### Delete User

**Method:** `DELETE`

**URL:** `/admin/users/{user_id}`

**Authentication:** JWT Bearer Token required

**Authorization:** `admin`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "User deleted successfully."
}
```

**Error Responses:**

| Status | Error        | Reason                                  |
| ------ | ------------ | --------------------------------------- |
| 401    | Unauthorized | Token missing or invalid                |
| 403    | Forbidden    | Only admins can delete users            |
| 400    | Bad Request  | Cannot delete yourself                  |
| 404    | Not Found    | User not found or not in user's company |

---

## Client Portal

### List Company Projects (Client View)

**Method:** `GET`

**URL:** `/client/projects`

**Authentication:** JWT Bearer Token required

**Authorization:** `client`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter | Type    | Description                         |
| --------- | ------- | ----------------------------------- |
| `page`    | integer | Pagination page number (default: 1) |

**Success Response:** `200 OK`

```json
{
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440010",
            "company_id": "550e8400-e29b-41d4-a716-446655440001",
            "created_by": "550e8400-e29b-41d4-a716-446655440000",
            "creator": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "John Doe"
            },
            "name": "Website Redesign",
            "description": "Complete redesign of company website",
            "status": "in_progress",
            "start_date": "2026-05-01",
            "end_date": "2026-06-30",
            "progress": 65,
            "budget": "50000.00",
            "tasks": [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440020",
                    "project_id": "550e8400-e29b-41d4-a716-446655440010",
                    "title": "Design homepage mockups",
                    "status": "in_progress",
                    "progress": 75
                }
            ]
        }
    ],
    "pagination": {
        "total": 5,
        "per_page": 20,
        "current_page": 1,
        "last_page": 1
    }
}
```

**Error Responses:**

| Status | Error        | Reason                                |
| ------ | ------------ | ------------------------------------- |
| 401    | Unauthorized | Token missing or invalid              |
| 403    | Forbidden    | Only clients can access client portal |

---

### View Project Details (Client View)

**Method:** `GET`

**URL:** `/client/projects/{project_id}`

**Authentication:** JWT Bearer Token required

**Authorization:** `client` (must be in same company)

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

```json
{
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "company_id": "550e8400-e29b-41d4-a716-446655440001",
        "created_by": "550e8400-e29b-41d4-a716-446655440000",
        "creator": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "John Doe"
        },
        "name": "Website Redesign",
        "description": "Complete redesign of company website",
        "status": "in_progress",
        "start_date": "2026-05-01",
        "end_date": "2026-06-30",
        "progress": 65,
        "budget": "50000.00",
        "tasks": [
            {
                "id": "550e8400-e29b-41d4-a716-446655440020",
                "project_id": "550e8400-e29b-41d4-a716-446655440010",
                "title": "Design homepage mockups",
                "description": "Create responsive homepage mockups",
                "status": "in_progress",
                "progress": 75,
                "deadline": "2026-05-20T23:59:59Z",
                "files": [
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440030",
                        "task_id": "550e8400-e29b-41d4-a716-446655440020",
                        "file_name": "homepage_mockup.pdf",
                        "file_path": "https://yourstorage.blob.core.windows.net/tasks/...",
                        "uploaded_by": "550e8400-e29b-41d4-a716-446655440000"
                    }
                ]
            }
        ]
    }
}
```

**Error Responses:**

| Status | Error        | Reason                                     |
| ------ | ------------ | ------------------------------------------ |
| 401    | Unauthorized | Token missing or invalid                   |
| 403    | Forbidden    | Only clients can access client portal      |
| 404    | Not Found    | Project not found or not in user's company |

---

### List Files (Client View)

**Method:** `GET`

**URL:** `/client/files`

**Authentication:** JWT Bearer Token required

**Authorization:** `client`

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter | Type    | Description                         |
| --------- | ------- | ----------------------------------- |
| `page`    | integer | Pagination page number (default: 1) |

**Success Response:** `200 OK`

```json
{
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440030",
            "task_id": "550e8400-e29b-41d4-a716-446655440020",
            "uploaded_by": "550e8400-e29b-41d4-a716-446655440000",
            "file_name": "homepage_mockup.pdf",
            "file_path": "https://yourstorage.blob.core.windows.net/tasks/550e8400-e29b-41d4-a716-446655440020/uuid_homepage_mockup.pdf",
            "file_type": "application/pdf",
            "file_size": 2048576,
            "uploaded_at": "2026-05-10T10:30:00Z",
            "task": {
                "id": "550e8400-e29b-41d4-a716-446655440020",
                "project_id": "550e8400-e29b-41d4-a716-446655440010",
                "title": "Design homepage mockups"
            }
        }
    ],
    "pagination": {
        "total": 8,
        "per_page": 20,
        "current_page": 1,
        "last_page": 1
    }
}
```

**Error Responses:**

| Status | Error        | Reason                                |
| ------ | ------------ | ------------------------------------- |
| 401    | Unauthorized | Token missing or invalid              |
| 403    | Forbidden    | Only clients can access this endpoint |

---

## Notifications

### List Notifications

**Method:** `GET`

**URL:** `/notifications`

**Authentication:** JWT Bearer Token required

**Authorization:** All authenticated users

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter | Type    | Description                         |
| --------- | ------- | ----------------------------------- |
| `page`    | integer | Pagination page number (default: 1) |

**Success Response:** `200 OK`

```json
{
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440060",
            "user_id": "550e8400-e29b-41d4-a716-446655440002",
            "title": "Task Assigned",
            "message": "You have been assigned to task: Design homepage mockups",
            "type": "task_assigned",
            "data": {},
            "is_read": false,
            "read_at": null,
            "created_at": "2026-05-15T14:30:00Z"
        },
        {
            "id": "550e8400-e29b-41d4-a716-446655440061",
            "user_id": "550e8400-e29b-41d4-a716-446655440002",
            "title": "Task Status Changed",
            "message": "Task Design homepage mockups status changed to in_progress",
            "type": "task_status_changed",
            "data": {},
            "is_read": true,
            "read_at": "2026-05-15T15:00:00Z",
            "created_at": "2026-05-15T14:25:00Z"
        }
    ],
    "unread_count": 1,
    "pagination": {
        "total": 2,
        "per_page": 20,
        "current_page": 1,
        "last_page": 1
    }
}
```

**Notification Types:**

- `task_assigned` - User assigned to a task
- `task_status_changed` - Task status changed
- `comment_added` - New comment on task
- `response_submitted` - Task response submitted
- `file_uploaded` - File uploaded to task

**Error Responses:**

| Status | Error        | Reason                   |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token missing or invalid |

---

### Mark Notification as Read

**Method:** `PATCH`

**URL:** `/notifications/{notification_id}/read`

**Authentication:** JWT Bearer Token required

**Authorization:** Notification owner only

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "Notification marked as read.",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440060",
        "user_id": "550e8400-e29b-41d4-a716-446655440002",
        "title": "Task Assigned",
        "message": "You have been assigned to task: Design homepage mockups",
        "type": "task_assigned",
        "is_read": true,
        "read_at": "2026-05-15T15:05:00Z"
    }
}
```

**Error Responses:**

| Status | Error        | Reason                   |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token missing or invalid |
| 404    | Not Found    | Notification not found   |

---

### Mark All Notifications as Read

**Method:** `PATCH`

**URL:** `/notifications/read-all`

**Authentication:** JWT Bearer Token required

**Authorization:** All authenticated users

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Success Response:** `200 OK`

```json
{
    "success": true,
    "message": "All notifications marked as read.",
    "updated_count": 5
}
```

**Error Responses:**

| Status | Error        | Reason                   |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token missing or invalid |

---

## Reports

### Get Weekly Report

**Method:** `GET`

**URL:** `/reports/weekly`

**Authentication:** JWT Bearer Token required

**Authorization:** Authorized via the `can:viewReports` gate (typically `admin` or `manager` roles)

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter | Type   | Description                             |
| --------- | ------ | --------------------------------------- |
| `range`   | string | Date range: `today` (default) or `week` |

**Success Response:** `200 OK`

```json
{
    "period": "weekly",
    "start_date": "2026-05-09",
    "end_date": "2026-05-15",
    "summary": {
        "completed_tasks": 12,
        "delayed_tasks": 3,
        "total_tasks": 25,
        "completion_rate": 48.0
    },
    "by_employee": [
        {
            "user_id": "550e8400-e29b-41d4-a716-446655440002",
            "user_name": "Jane Smith",
            "role": "employee",
            "completed_tasks": 6,
            "delayed_tasks": 0,
            "total_tasks": 10,
            "completion_rate": 60.0
        }
    ],
    "by_project": [
        {
            "project_id": "550e8400-e29b-41d4-a716-446655440010",
            "project_name": "Website Redesign",
            "completed_tasks": 5,
            "delayed_tasks": 1,
            "total_tasks": 12,
            "completion_rate": 41.67
        }
    ],
    "top_performers": [
        {
            "user_id": "550e8400-e29b-41d4-a716-446655440002",
            "user_name": "Jane Smith",
            "completion_rate": 60.0,
            "tasks_completed": 6
        }
    ],
    "inactive_employees": [],
    "overdue_summary": {
        "total_overdue": 3,
        "overdue_tasks": [
            {
                "task_id": "550e8400-e29b-41d4-a716-446655440022",
                "task_title": "Backend API Development",
                "deadline": "2026-05-10T23:59:59Z",
                "days_overdue": 5,
                "assignee": "John Developer"
            }
        ]
    }
}
```

**Error Responses:**

| Status | Error        | Reason                                    |
| ------ | ------------ | ----------------------------------------- |
| 401    | Unauthorized | Token missing or invalid                  |
| 403    | Forbidden    | Only admins and managers can view reports |

---

### Get Monthly Report

**Method:** `GET`

**URL:** `/reports/monthly`

**Authentication:** JWT Bearer Token required

**Authorization:** Authorized via the `can:viewReports` gate (typically `admin` or `manager` roles)

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter | Type   | Description                              |
| --------- | ------ | ---------------------------------------- |
| `range`   | string | Date range: `today` or `month` (default) |

**Success Response:** `200 OK`

Same structure as Weekly Report with monthly aggregation

**Error Responses:**

| Status | Error        | Reason                                    |
| ------ | ------------ | ----------------------------------------- |
| 401    | Unauthorized | Token missing or invalid                  |
| 403    | Forbidden    | Only admins and managers can view reports |

---

### Get Custom Report

**Method:** `GET`

**URL:** `/reports/custom`

**Authentication:** JWT Bearer Token required

**Authorization:** Authorized via the `can:viewReports` gate (typically `admin` or `manager` roles)

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter    | Type | Description                                |
| ------------ | ---- | ------------------------------------------ |
| `start_date` | date | Start date in YYYY-MM-DD format (required) |
| `end_date`   | date | End date in YYYY-MM-DD format (required)   |

**Validation Rules:**

- `start_date` - required, valid date format
- `end_date` - required, valid date format, must be >= start_date

**Success Response:** `200 OK`

Same structure as Weekly Report with custom date range

**Error Responses:**

| Status | Error            | Reason                                      |
| ------ | ---------------- | ------------------------------------------- |
| 401    | Unauthorized     | Token missing or invalid                    |
| 403    | Forbidden        | Only admins and managers can view reports   |
| 422    | Validation Error | Invalid dates or end_date before start_date |

---

## Activity Logs

### List Activity Logs

**Method:** `GET`

**URL:** `/activity-logs`

**Authentication:** JWT Bearer Token required

**Authorization:** All authenticated users

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter    | Type    | Description                                            |
| ------------ | ------- | ------------------------------------------------------ |
| `page`       | integer | Pagination page number (default: 1)                    |
| `range`      | string  | Date range filter: `today`, `week`, `month` (optional) |
| `start_date` | date    | Custom start date in YYYY-MM-DD format (optional)      |
| `end_date`   | date    | Custom end date in YYYY-MM-DD format (optional)        |

**Success Response:** `200 OK`

```json
{
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440070",
            "user": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "John Doe",
                "email": "john.doe@acme.com",
                "avatar_url": null
            },
            "action": "task_created",
            "entity_type": "Task",
            "entity_id": "550e8400-e29b-41d4-a716-446655440021",
            "description": "Task 'Implement payment gateway' created",
            "old_values": {},
            "new_values": {
                "title": "Implement payment gateway",
                "status": "pending"
            },
            "ip_address": "192.168.1.100",
            "created_at": "2026-05-15T14:30:00Z"
        }
    ],
    "pagination": {
        "total": 45,
        "per_page": 20,
        "current_page": 1,
        "last_page": 3,
        "from": 1,
        "to": 20,
        "has_more": true
    }
}
```

**Log Actions:**

- `task_created` - Task created
- `task_assigned` - Task assigned to employee
- `task_status_changed` - Task status updated
- `comment_created` - Comment added to task
- `comment_updated` - Comment updated
- `comment_deleted` - Comment deleted
- `file_uploaded` - File uploaded to task
- `response_submitted` - Task response submitted

**Error Responses:**

| Status | Error        | Reason                   |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Token missing or invalid |

---

### Get Task Activity Logs

**Method:** `GET`

**URL:** `/tasks/{task_id}/activity-logs`

**Authentication:** JWT Bearer Token required

**Authorization:** User must be assigned to task or admin

**Headers:**

```json
{
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Accept": "application/json"
}
```

**Query Parameters:**

| Parameter | Type    | Description                         |
| --------- | ------- | ----------------------------------- |
| `page`    | integer | Pagination page number (default: 1) |

**Success Response:** `200 OK`

```json
{
    "task_id": "550e8400-e29b-41d4-a716-446655440021",
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440070",
            "user": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "John Doe",
                "email": "john.doe@acme.com",
                "avatar_url": null
            },
            "action": "task_assigned",
            "entity_type": "Task",
            "entity_id": "550e8400-e29b-41d4-a716-446655440021",
            "description": "Task assigned to Jane Smith as developer",
            "old_values": {},
            "new_values": {
                "assignee_id": "550e8400-e29b-41d4-a716-446655440002",
                "role": "developer"
            },
            "ip_address": "192.168.1.100",
            "created_at": "2026-05-15T14:31:00Z"
        }
    ],
    "pagination": {
        "total": 12,
        "per_page": 20,
        "current_page": 1,
        "last_page": 1,
        "from": 1,
        "to": 12,
        "has_more": false
    }
}
```

**Error Responses:**

| Status | Error        | Reason                                  |
| ------ | ------------ | --------------------------------------- |
| 401    | Unauthorized | Token missing or invalid                |
| 403    | Forbidden    | Not authorized to view this task's logs |
| 404    | Not Found    | Task not found                          |

---

## Global Date Filtering System

The API provides a flexible date filtering system using the `DateFilter` trait. This system is available on multiple endpoints that return time-sensitive data.

### Supported Query Parameters

#### Predefined Date Ranges

Use the `range` parameter for quick filtering:

```
GET /admin/tasks?range=today          # Today only
GET /admin/tasks?range=week           # Last 7 days including today
GET /admin/tasks?range=month          # Current month
```

#### Custom Date Ranges

Use `start_date` and `end_date` for custom ranges:

```
GET /admin/tasks?start_date=2026-05-01&end_date=2026-05-15
GET /reports/custom?start_date=2026-04-01&end_date=2026-04-30
```

#### Date Format

All dates must be in ISO 8601 format: `YYYY-MM-DD`

### Endpoints Supporting Date Filtering

| Endpoint               | Parameters                          | Field Filtered             |
| ---------------------- | ----------------------------------- | -------------------------- |
| `GET /admin/projects`  | `range`, `start_date`, `end_date`   | `created_at`               |
| `GET /admin/tasks`     | `range`, `start_date`, `end_date`   | `created_at`               |
| `GET /dashboard/stats` | `range`, `start_date`, `end_date`   | `created_at`, `updated_at` |
| `GET /activity-logs`   | `range`, `start_date`, `end_date`   | `created_at`               |
| `GET /reports/weekly`  | `range`                             | Report generation period   |
| `GET /reports/monthly` | `range`                             | Report generation period   |
| `GET /reports/custom`  | `start_date`, `end_date` (required) | Report generation period   |

> Note: `GET /dashboard/workload` and `GET /dashboard/performance` are admin-only dashboards and do not support the date range filters above.

### Examples

**Get projects created in the last 7 days:**

```
GET /admin/projects?range=week
```

**Get tasks created in May 2026:**

```
GET /admin/tasks?start_date=2026-05-01&end_date=2026-05-31
```

**Get dashboard stats for today:**

```
GET /dashboard/stats?range=today
```

**Get activity logs for a custom date range:**

```
GET /activity-logs?start_date=2026-05-01&end_date=2026-05-15
```

---

## Common Response Formats

### Pagination Metadata

Most list endpoints return pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "per_page": 20,
    "current_page": 1,
    "last_page": 5
  }
}
```

### Alternative Pagination Format

Some endpoints use an expanded pagination format:

```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "per_page": 20,
    "current_page": 1,
    "last_page": 5,
    "from": 1,
    "to": 20,
    "has_more": true
  }
}
```

### Error Response Format

All errors follow this format:

```json
{
    "success": false,
    "message": "Error message",
    "errors": {
        "field_name": ["Validation error message"]
    }
}
```

### Validation Error Response (422)

```json
{
    "message": "The given data was invalid.",
    "errors": {
        "email": ["The email field is required."],
        "password": ["The password must be at least 8 characters."]
    }
}
```

---

## System Architecture Overview

### JWT Authentication

The API uses **JWT (JSON Web Token)** authentication with the following flow:

1. **Registration/Login:** User provides credentials, receives JWT token
2. **Token Structure:**
    - Header: Algorithm (HS256)
    - Payload: User ID, company ID, roles, expiration
    - Signature: HMAC-SHA256
3. **Token Refresh:** Users can refresh tokens before expiration
4. **Token Expiration:** Tokens expire after configured TTL (typically 1 hour)

**Implementation Details:**

- Library: `tymon/jwt-auth`
- Middleware: `auth:api`
- Token placement: `Authorization: Bearer {token}` header

### Role-Based Access Control (RBAC)

The system implements granular role-based access control:

**Roles:**

- `super_admin` - System-wide access (cannot be assigned by admins)
- `admin` - Full company management access
- `manager` - Report and analytics access
- `employee` - Limited task access
- `client` - Read-only project access

**Implementation:**

- Role Middleware: `RoleMiddleware` validates user roles for protected routes
- Route Protection: `middleware(['auth:api', 'role:admin,manager'])`
- Gate-based Authorization: Custom gates for complex policies (e.g., `can:viewReports`)
- Policy-based Authorization: Model policies for granular control

### Company Isolation (Multi-Tenancy)

All resources are company-scoped to ensure data isolation:

**Implementation:**

- `company_id` field on all data tables
- `scopeInSameCompany()` Eloquent scope applied to queries
- Company validation on every resource endpoint
- Request headers automatically include user's company context

**Security:**

- Cross-company access attempts return 404 (not 403)
- Queries automatically filtered by authenticated user's company
- No admin override for cross-company access

### Azure Blob Storage Integration

Files are stored in Azure Blob Storage for scalability:

**Features:**

- File Upload: POST `/admin/tasks/{id}/files`
- File Retrieval: Signed URLs via `Storage::disk('azure')->url()`
- File Organization: `tasks/{task_id}/` folder structure
- File Naming: UUID prefix + original filename for uniqueness

**Storage Configuration:**

- Disk: `azure`
- Container: Configured in `config/filesystems.php`
- Visibility: Public URLs for signed access
- Cleanup: Soft-deleted files not purged automatically

### Activity Logging System

Comprehensive audit trail for compliance:

**Logged Events:**

- Task creation/updates
- Task assignments
- Task status changes
- Comments (create, update, delete)
- File uploads
- Response submissions

**Log Structure:**

- `user_id` - User performing action
- `action` - Action type
- `entity_type` - Affected resource type (Task, Project, etc.)
- `entity_id` - Affected resource ID
- `description` - Human-readable description
- `old_values` - Previous values
- `new_values` - New values
- `ip_address` - Request IP address
- `created_at` - Timestamp

### Notification System

Event-driven notifications for real-time updates:

**Events:**

- `TaskAssigned` - User assigned to task
- `TaskStatusChanged` - Task status updated
- `CommentAdded` - Comment posted on task
- `ResponseSubmitted` - Task response submitted
- `FileUploaded` - File uploaded to task

**Implementation:**

- Event/Listener architecture
- Queued for background processing
- Stored in notifications table
- Mark as read functionality
- Paginated retrieval

**Notification Types:**

- `task_assigned`
- `task_status_changed`
- `comment_added`
- `response_submitted`
- `file_uploaded`

### Date Filtering System

Reusable trait for flexible date range filtering:

**Trait:** `DateFilter` on models
**Methods:**

- `parseRangeFromRequest()` - Parse request date parameters
- `scopeDateRange()` - Apply date range filter to query
- `scopeApplyRequestRange()` - Convenience method combining both

**Supported Patterns:**

- `range=today` - Current day
- `range=week` - Last 7 days
- `range=month` - Current calendar month
- `start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` - Custom range

**Usage:**

```php
Project::applyRequestRange($request, 'created_at')->get();
```

### Resource Transformations

API responses use **Resource** classes for consistent data transformation:

**Resources:**

- `UserResource` - User data
- `ProjectResource` - Project data
- `TaskResource` - Task data with relationships
- `TaskFileResource` - File metadata with signed URLs
- `TaskCommentResource` - Comment data with user
- `TaskResponseResource` - Response data
- `ActivityLogResource` - Activity log data

**Features:**

- Conditional data inclusion via `whenLoaded()`
- Automatic date formatting
- Relationship eager loading
- Azure Blob Storage URL generation

### Form Request Validation

Input validation via Form Request classes:

**Features:**

- Centralized validation rules
- Custom error messages
- Authorization checks
- Automatic JSON response for validation errors

**Typical Rules:**

- Required fields
- Email format validation
- Unique constraints
- File type/size validation
- Date format validation
- Password complexity requirements

---

## Rate Limiting (Future)

The API is prepared for rate limiting via Laravel middleware. Implementation details:

- Per-authenticated user limits
- Company-level quotas
- Endpoint-specific limits

---

## API Versioning

**Current Version:** v1.0.0 (implicit in `/api` prefix)

Future versions may use URL versioning: `/api/v2/`

---

## Support & Documentation

For additional support:

- **API Issues:** Check error responses for detailed messages
- **Authentication:** Verify token is valid and not expired
- **Company Scoping:** Ensure all requests operate within your company context
- **File Uploads:** Maximum 20 MB per file
- **Pagination:** Default page size 15-20 items

---

**End of Documentation**
