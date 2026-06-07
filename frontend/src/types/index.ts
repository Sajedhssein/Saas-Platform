import type { Project } from './project';
import type { TaskStatus } from './task';

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    company?: string;
    company_name?: string;
    phone?: string;
    department?: string;
    position?: string;
    role: 'admin' | 'employee' | 'client';
    roles?: Array<{ name?: string | null; slug?: string | null; role?: string | null } | string> | string[];
    first_login_at?: string | null;
    last_login_at?: string | null;
    show_welcome?: boolean;
}

export type { Project, ProjectEmployeeRef } from './project';
export type {
    GeneralSettings,
    NotificationSettings,
    SecuritySettingsPayload,
    TeamMember,
    TeamSettingsResponse,
    UpdateGeneralSettingsPayload,
} from './settings';
export type {
    Task,
    TaskProject,
    TaskCreator,
    TaskAssignee,
    TaskFile,
    TaskResponse,
    PaginatedTasksResponse,
    TaskResponseEnvelope,
    CreateTaskPayload,
    UpdateTaskPayload,
    TaskListParams,
    TaskStatus,
    TaskPriority,
} from './task';

export interface Employee {
    id: string;
    name: string;
    email: string;
    role: string;
    position?: string;
    phone?: string;
    status?: string;
    joinedDate?: string;
    avatar: string;
    performance: number;
    completedTasks: number;
    totalAssignedTasks?: number;
    inProgressTasks?: number;
    todoTasks?: number;
    completionRate?: number;
    activeTasks?: Array<{
        id: string;
        title: string;
        status: TaskStatus;
        progress?: number;
        deadline?: string | null;
        project?: {
            id: string;
            name: string;
        } | null;
    }>;
    department: string;
}

export interface Client {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company: string;
    avatar: string;
    projects: number;
    projects_count?: number;
    latest_projects?: Project[];
    status: 'active' | 'inactive';
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    timestamp: string;
    created_at?: string | null;
    read_at?: string | null;
    is_read?: boolean;
    entity_type?: string | null;
    entity_id?: string | null;
    metadata?: Record<string, unknown> | null;
    data?: Record<string, unknown> | null;
}

export type {
    ActivityLog,
    ActivityLogFeed,
    ActivityLogPagination,
    ActivityMetadata,
    ActivityUser,
} from './activity';

export type {
    AnalyticsKPI,
    DashboardPerformanceResponse,
    DashboardStats,
    DashboardStatsResponse,
    DashboardWorkloadResponse,
    EmployeeDashboard,
    EmployeeDashboardNotification,
    EmployeeDashboardResponse,
    EmployeeDashboardTask,
    EmployeeTaskStatus,
    PerformanceData,
    PerformanceEmployee,
    ProjectProgress,
    ProjectStatus,
    TopPerformer,
    WorkloadData,
    WorkloadEmployee,
} from './dashboard';

export type {
    ReportType,
    ReportFormat,
    ReportStatus,
    ReportRecord,
    ReportCollectionEnvelope,
    ReportRecordEnvelope,
    GenerateReportPayload,
    EmailReportPayload,
    ProjectStats,
    TaskStats,
    EmployeeStats,
    TopPerformer as ReportTopPerformer,
    PerformanceStats,
    ReportResponse,
    ReportEnvelope,
} from './report';
