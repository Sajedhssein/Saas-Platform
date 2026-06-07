import type { AxiosError } from 'axios';
import api from '../api/axios';
import { makeError } from '../utils/error';
import type {
    ClientAnalytics,
    ClientAnalyticsResponse,
    DashboardPerformanceResponse,
    DashboardStats,
    DashboardStatsResponse,
    DashboardWorkloadResponse,
    EmployeeDashboard,
    EmployeeDashboardNotification,
    EmployeeDashboardResponse,
    EmployeeDashboardTask,
    EmployeeWeeklyProductivityItem,
    ProjectDistribution,
    PerformanceData,
    ProjectProgress,
    WeeklyProductivityItem,
    WorkloadData,
    TopPerformer,
    TopClient,
} from '../types/dashboard';
import type { ActivityLog } from '../types/activity';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const readNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return fallback;
};

const readString = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    return fallback;
};

const pickNumber = (source: UnknownRecord, keys: string[], fallback = 0): number => {
    for (const key of keys) {
        if (key in source) {
            return readNumber(source[key], fallback);
        }
    }

    return fallback;
};

const pickString = (source: UnknownRecord, keys: string[], fallback = ''): string => {
    for (const key of keys) {
        if (key in source) {
            return readString(source[key], fallback);
        }
    }

    return fallback;
};

const unwrapPayload = (payload: unknown): unknown => {
    if (isRecord(payload) && 'data' in payload) {
        return payload.data;
    }

    return payload;
};

const normalizeStatus = (value: unknown, progress: number): EmployeeDashboardTask['status'] => {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase().replace(/_/g, '-');

        if (normalized === 'in-progress' || normalized === 'completed' || normalized === 'pending' || normalized === 'overdue') {
            return normalized;
        }
    }

    if (progress >= 100) {
        return 'completed';
    }

    if (progress > 0) {
        return 'in-progress';
    }

    return 'pending';
};

const normalizeActivityUser = (value: unknown): ActivityLog['user'] => {
    if (!isRecord(value)) {
        return null;
    }

    return {
        id: pickString(value, ['id', 'user_id', 'userId'], 'system'),
        name: pickString(value, ['name', 'display_name', 'displayName'], 'System'),
        avatar: pickString(value, ['avatar', 'avatar_url', 'avatarUrl'], '') || null,
    };
};

const normalizeActivityLog = (item: unknown, index: number): ActivityLog | null => {
    if (!isRecord(item)) {
        return null;
    }

    return {
        id: pickString(item, ['id', 'activity_id', 'activityId'], `activity-${index}`),
        action: pickString(item, ['action', 'type'], 'activity'),
        description: pickString(item, ['description', 'message'], 'Activity recorded'),
        metadata: isRecord(item.metadata) ? item.metadata : null,
        user: normalizeActivityUser(item.user),
        created_at: pickString(item, ['created_at', 'createdAt', 'timestamp'], new Date().toISOString()),
    };
};

const normalizeActivityLogs = (value: unknown): ActivityLog[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item, index) => normalizeActivityLog(item, index))
        .filter((item): item is ActivityLog => item !== null);
};

const defaultClientAnalytics = (): ClientAnalytics => ({
    total_clients: 0,
    new_this_month: 0,
    active_clients: 0,
    inactive_clients: 0,
    top_clients: [],
    project_distribution: {
        active: 0,
        completed: 0,
        pending: 0,
    },
});

const parseTopClients = (value: unknown): TopClient[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item, index) => {
            if (!isRecord(item)) {
                return null;
            }

            return {
                id: pickString(item, ['id', 'client_id', 'clientId'], `client-${index}`),
                name: pickString(item, ['name', 'client_name', 'clientName'], `Client ${index + 1}`),
                projects_count: pickNumber(item, ['projects_count', 'projectsCount', 'total_projects', 'totalProjects'], 0),
                completed_projects: pickNumber(item, ['completed_projects', 'completedProjects'], 0),
            };
        })
        .filter((item): item is TopClient => item !== null);
};

const parseProjectDistribution = (value: unknown): ProjectDistribution => {
    if (!isRecord(value)) {
        return { active: 0, completed: 0, pending: 0 };
    }

    return {
        active: pickNumber(value, ['active', 'active_projects', 'activeProjects'], 0),
        completed: pickNumber(value, ['completed', 'completed_projects', 'completedProjects'], 0),
        pending: pickNumber(value, ['pending', 'pending_projects', 'pendingProjects'], 0),
    };
};

const normalizeClientAnalytics = (payload: unknown): ClientAnalytics => {
    if (payload == null) {
        return defaultClientAnalytics();
    }

    if (Array.isArray(payload)) {
        return defaultClientAnalytics();
    }

    if (!isRecord(payload)) {
        return defaultClientAnalytics();
    }

    const source = isRecord(payload.data) ? payload.data : payload;

    return {
        total_clients: pickNumber(source, ['total_clients', 'totalClients'], 0),
        new_this_month: pickNumber(source, ['new_this_month', 'newThisMonth'], 0),
        active_clients: pickNumber(source, ['active_clients', 'activeClients'], 0),
        inactive_clients: pickNumber(source, ['inactive_clients', 'inactiveClients'], 0),
        top_clients: parseTopClients(source.top_clients ?? source.topClients ?? source.clients ?? []),
        project_distribution: parseProjectDistribution(source.project_distribution ?? source.projectDistribution),
    };
};

const parseProjectProgress = (value: unknown, fallbackRate: number): ProjectProgress[] => {
    if (!Array.isArray(value)) {
        return fallbackRate > 0
            ? [
                {
                    id: 'overall-projects',
                    name: 'Overall Project Completion',
                    progress: fallbackRate,
                    status: fallbackRate >= 100 ? 'completed' : fallbackRate > 0 ? 'in-progress' : 'pending',
                },
            ]
            : [];
    }

    return value
        .map((item, index) => {
            if (!isRecord(item)) {
                return null;
            }

            return {
                id: pickString(item, ['id', 'project_id', 'projectId'], `project-${index}`),
                name: pickString(item, ['name', 'project_name', 'projectName'], `Project ${index + 1}`),
                progress: pickNumber(item, ['progress', 'percentage', 'completion_rate', 'completionRate']),
                status: (pickString(item, ['status'], 'pending') as ProjectProgress['status']),
            };
        })
        .filter((item): item is ProjectProgress => item !== null);
};

const parseProjectProgressOverview = (value: unknown): ProjectProgress[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item, index) => {
            if (!isRecord(item)) {
                return null;
            }

            const progress = pickNumber(item, ['progress_percentage', 'progressPercentage', 'progress', 'completion_rate', 'completionRate']);

            return {
                id: pickString(item, ['project_id', 'projectId', 'id'], `project-${index}`),
                name: pickString(item, ['project_name', 'projectName', 'name'], `Project ${index + 1}`),
                progress,
                status: progress >= 100 ? 'completed' : progress > 0 ? 'in-progress' : 'pending',
            };
        })
        .filter((item): item is ProjectProgress => item !== null);
};

const parseWeeklyProductivity = (value: unknown): WeeklyProductivityItem[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item, index) => {
            if (!isRecord(item)) {
                return null;
            }

            return {
                day: pickString(item, ['day', 'name', 'label'], `Day ${index + 1}`),
                completed: pickNumber(item, ['completed', 'completed_tasks', 'completedTasks'], 0),
            };
        })
        .filter((item): item is WeeklyProductivityItem => item !== null);
};

const normalizeStats = (payload: unknown): DashboardStats => {
    if (!isRecord(payload)) {
        throw makeError('Malformed dashboard stats response');
    }

    const projectProgressOverview = parseProjectProgressOverview(payload.project_progress_overview ?? payload.projectProgressOverview);
    const weeklyProductivity = parseWeeklyProductivity(payload.weekly_productivity ?? payload.weeklyProductivity);
    const recentActivity = normalizeActivityLogs(payload.recent_activity ?? payload.recentActivity);
    const totalTasks = pickNumber(payload, ['total_tasks', 'totalTasks']);
    const completedTasks = pickNumber(payload, ['completed_tasks', 'completedTasks']);
    const activeTasks = pickNumber(payload, ['active_tasks', 'in_progress_tasks', 'inProgressTasks']);
    const projectCompletionRate = pickNumber(
        payload,
        ['project_completion_rate', 'projectCompletionRate'],
        projectProgressOverview.length > 0
            ? Number((projectProgressOverview.reduce((sum, item) => sum + item.progress, 0) / projectProgressOverview.length).toFixed(1))
            : pickNumber(payload, ['task_completion_percentage', 'taskCompletionPercentage'], totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(2)) : 0),
    );
    const projectProgress = parseProjectProgress(
        payload.project_progress ?? payload.projectProgress,
        projectProgressOverview.length > 0
            ? Number((projectProgressOverview.reduce((sum, item) => sum + item.progress, 0) / projectProgressOverview.length).toFixed(1))
            : projectCompletionRate,
    );
    const pendingTasks = pickNumber(payload, ['pending_tasks', 'pendingTasks'], Math.max(totalTasks - completedTasks - activeTasks, 0));
    const inProgressTasks = activeTasks;
    const totalProjects = pickNumber(payload, ['total_projects', 'totalProjects'], projectProgressOverview.length);
    const activeProjects = pickNumber(payload, ['active_projects', 'activeProjects'], Math.max(totalProjects - projectProgressOverview.filter((item) => item.status === 'completed').length, 0));
    const completedProjects = pickNumber(payload, ['completed_projects', 'completedProjects'], projectProgressOverview.filter((item) => item.status === 'completed').length);
    const totalEmployees = pickNumber(payload, ['total_employees', 'totalEmployees', 'total_users', 'totalUsers']);
    const activeEmployees = pickNumber(payload, ['active_employees', 'activeEmployees']);
    const delayedTasks = pickNumber(payload, ['delayed_tasks_count', 'delayedTasksCount'], Math.max(pendingTasks, 0));
    const taskCompletionPercentage = pickNumber(payload, ['task_completion_percentage', 'taskCompletionPercentage'], totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(2)) : 0);

    return {
        total_projects: totalProjects,
        active_projects: activeProjects,
        completed_projects: completedProjects,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        pending_tasks: pendingTasks,
        in_progress_tasks: inProgressTasks,
        total_employees: totalEmployees,
        active_employees: activeEmployees,
        project_completion_rate: projectCompletionRate,
        project_progress: projectProgress,
        weekly_productivity: weeklyProductivity,
        recent_activity: recentActivity,
        totalProjects,
        activeProjects,
        completedProjects,
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        totalEmployees,
        activeEmployees,
        projectCompletionRate,
        taskCompletionPercentage,
        delayedTasks,
        projectProgress,
        weeklyProductivity,
        recentActivity,
    };
};

const normalizeWorkloadItem = (item: unknown, index: number): WorkloadData => {
    const source = isRecord(item) ? item : {};
    const employeeId = pickString(source, ['employee_id', 'employeeId', 'id'], `employee-${index}`);
    const employeeName = pickString(source, ['employee_name', 'employeeName', 'name'], 'Unknown employee');
    const assignedTasks = pickNumber(source, ['assigned_tasks', 'assignedTasks', 'total_assigned_tasks', 'totalAssignedTasks']);
    const completedTasks = pickNumber(source, ['completed_tasks', 'completedTasks']);
    const workloadPercentage = pickNumber(source, ['workload_percentage', 'workloadPercentage'], assignedTasks > 0 ? Number(((completedTasks / assignedTasks) * 100).toFixed(1)) : 0);

    return {
        employee_id: employeeId,
        employee_name: employeeName,
        assigned_tasks: assignedTasks,
        completed_tasks: completedTasks,
        workload_percentage: workloadPercentage,
        employeeId,
        employeeName,
        totalAssignedTasks: assignedTasks,
        completedTasks,
        workloadPercentage,
    };
};

const normalizePerformance = (payload: unknown): PerformanceData => {
    const rawPerformance = isRecord(payload) ? payload.employee_performance ?? payload.employeePerformance ?? payload.top_performers ?? payload.topPerformers : payload;

    const performanceRows = Array.isArray(rawPerformance)
        ? rawPerformance
            .map((item, index) => {
                if (!isRecord(item)) {
                    return null;
                }

                const completedTasks = pickNumber(item, ['completed_tasks', 'completedTasks']);
                const completionRate = pickNumber(item, ['completion_rate', 'completionRate'], completedTasks);
                const overdueTasks = pickNumber(item, ['overdue_tasks', 'overdueTasks']);

                return {
                    id: pickString(item, ['id', 'employee_id', 'employeeId'], `performer-${index}`),
                    name: pickString(item, ['employee_name', 'employeeName', 'name'], 'Unknown employee'),
                    completed_tasks: completedTasks,
                    completedTasks,
                    completionRate,
                    overdueTasks,
                };
            })
            .filter((item): item is { id: string; name: string; completed_tasks: number; completedTasks: number; completionRate: number; overdueTasks: number } => item !== null)
        : [];

    const totalCompleted = performanceRows.reduce((sum, item) => sum + item.completed_tasks, 0);
    const totalEmployees = performanceRows.length;
    const averageCompletionRate = performanceRows.length > 0
        ? Number((performanceRows.reduce((sum, item) => sum + item.completionRate, 0) / performanceRows.length).toFixed(1))
        : 0;
    const overdueTasks = performanceRows.reduce((sum, item) => sum + item.overdueTasks, 0);
    const weeklyProductivity = isRecord(payload)
        ? pickNumber(payload, ['weekly_productivity', 'weeklyProductivity'], totalEmployees > 0 ? Number(((totalCompleted / Math.max(totalEmployees, 1)) * 100).toFixed(1)) : 0)
        : 0;
    const averageTaskCompletion = isRecord(payload)
        ? pickNumber(payload, ['average_task_completion', 'averageTaskCompletion'], averageCompletionRate)
        : averageCompletionRate;

    const sortedTopPerformers = performanceRows
        .map(({ id, name, completed_tasks, completedTasks }) => ({ id, name, completed_tasks, completedTasks } satisfies TopPerformer))
        .sort((left, right) => right.completed_tasks - left.completed_tasks);

    return {
        weekly_productivity: weeklyProductivity,
        average_task_completion: averageTaskCompletion,
        overdue_tasks: overdueTasks,
        top_performers: sortedTopPerformers,
        weeklyProductivity,
        averageTaskCompletion,
        overdueTasks,
        topPerformers: sortedTopPerformers,
    };
};

const normalizeEmployeeTask = (item: unknown, index: number): EmployeeDashboardTask => {
    const source = isRecord(item) ? item : {};
    const progress = pickNumber(source, ['progress', 'completion_rate', 'completionRate'], 0);

    return {
        id: pickString(source, ['id', 'task_id', 'taskId'], `task-${index}`),
        title: pickString(source, ['title', 'name'], `Task ${index + 1}`),
        description: pickString(source, ['description', 'details', 'body'], 'No description provided.'),
        status: normalizeStatus(source.status, progress),
        progress,
        deadline: source.deadline && typeof source.deadline === 'string' ? source.deadline : null,
        project: {
            id: pickString(source, ['project_id', 'projectId'], `project-${index}`),
            name: isRecord(source.project)
                ? pickString(source.project, ['name', 'title'], `Project ${index + 1}`)
                : pickString(source, ['project_name', 'projectName'], `Project ${index + 1}`),
        },
        priority: typeof source.priority === 'string' ? source.priority : null,
    };
};

const normalizeEmployeeNotification = (item: unknown, index: number): EmployeeDashboardNotification => {
    const source = isRecord(item) ? item : {};

    return {
        id: pickString(source, ['id', 'notification_id', 'notificationId'], `notification-${index}`),
        title: pickString(source, ['title', 'subject', 'name'], `Notification ${index + 1}`),
        message: pickString(source, ['message', 'body', 'description'], ''),
        type: pickString(source, ['type', 'notification_type', 'notificationType'], 'info'),
        read: Boolean(source.read ?? source.is_read ?? false),
        timestamp: pickString(source, ['timestamp', 'created_at', 'createdAt'], new Date().toISOString()),
        entity_type: typeof source.entity_type === 'string' ? source.entity_type : null,
        entity_id: typeof source.entity_id === 'string' ? source.entity_id : null,
    };
};

const normalizeEmployeeWeeklyProductivity = (value: unknown): EmployeeWeeklyProductivityItem[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item, index) => {
            if (!isRecord(item)) {
                return null;
            }

            return {
                day: pickString(item, ['day', 'label', 'name'], `Day ${index + 1}`),
                completed: pickNumber(item, ['completed', 'completed_tasks', 'completedTasks'], 0),
            };
        })
        .filter((item): item is EmployeeWeeklyProductivityItem => item !== null);
};

const deriveEmployeeSummary = (tasks: EmployeeDashboardTask[], payload: UnknownRecord): Pick<EmployeeDashboard, 'my_tasks' | 'completed_tasks' | 'pending_tasks' | 'overdue_tasks' | 'my_projects' | 'completion_rate' | 'completed_this_week' | 'projects_this_week' | 'active_tasks' | 'unread_notifications_count'> => {
    const myTasks = pickNumber(payload, ['my_tasks', 'assigned_tasks', 'total_tasks', 'tasks_count'], tasks.length);
    const completedTasks = pickNumber(payload, ['completed_tasks', 'completedTasks'], tasks.filter((task) => task.status === 'completed').length);
    const pendingTasks = pickNumber(payload, ['pending_tasks', 'pendingTasks'], tasks.filter((task) => task.status === 'pending').length);
    const overdueTasks = pickNumber(payload, ['overdue_tasks', 'overdueTasks'], tasks.filter((task) => task.status === 'overdue').length);
    const projectsFromTasks = Array.from(new Set(tasks.map((task) => task.project.id))).filter((projectId) => projectId !== '').length;
    const myProjects = pickNumber(payload, ['my_projects', 'myProjects', 'projects_count', 'projectsCount'], projectsFromTasks);
    const completionRate = pickNumber(
        payload,
        ['completion_rate', 'completionRate'],
        myTasks > 0 ? Number(((completedTasks / myTasks) * 100).toFixed(1)) : 0,
    );

    return {
        my_tasks: myTasks,
        completed_tasks: completedTasks,
        pending_tasks: pendingTasks,
        overdue_tasks: overdueTasks,
        my_projects: myProjects,
        completion_rate: completionRate,
        completed_this_week: pickNumber(payload, ['completed_this_week', 'completedThisWeek'], completedTasks),
        projects_this_week: pickNumber(payload, ['projects_this_week', 'projectsThisWeek'], myProjects),
        active_tasks: pickNumber(payload, ['active_tasks', 'activeTasks'], tasks.filter((task) => task.status !== 'completed').length),
        unread_notifications_count: pickNumber(payload, ['unread_notifications_count', 'unreadNotificationsCount']),
    };
};

const normalizeEmployeeDashboard = (payload: unknown): EmployeeDashboard => {
    if (!isRecord(payload)) {
        const emptyTasks: EmployeeDashboardTask[] = [];
        return {
            my_tasks: 0,
            completed_tasks: 0,
            pending_tasks: 0,
            overdue_tasks: 0,
            my_projects: 0,
            completion_rate: 0,
            completed_this_week: 0,
            projects_this_week: 0,
            active_tasks: 0,
            unread_notifications_count: 0,
            recent_tasks: emptyTasks,
            notifications: [],
            weekly_productivity: [],
            weeklyProductivity: [],
            myTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            overdueTasks: 0,
            myProjects: 0,
            completionRate: 0,
            completedThisWeek: 0,
            projectsThisWeek: 0,
            activeTasks: 0,
            unreadNotificationsCount: 0,
            recentTasks: emptyTasks,
            trendData: [],
            recent_activity: [],
            recentActivity: [],
        };
    }

    const source = isRecord(payload.data) ? payload.data : payload;
    const recentTasksSource = source.recent_tasks ?? source.recentTasks ?? source.tasks ?? [];
    const notificationsSource = source.notifications ?? source.recent_notifications ?? source.recentNotifications ?? [];
    const weeklyProductivitySource = source.weekly_productivity ?? source.weeklyProductivity ?? [];
    const recentActivity = normalizeActivityLogs(source.recent_activity ?? source.recentActivity);
    const recentTasks = Array.isArray(recentTasksSource) ? recentTasksSource.map(normalizeEmployeeTask) : [];
    const summarySource = isRecord(source.summary)
        ? { ...source.summary, unread_notifications_count: source.unread_notifications_count }
        : source;
    const summary = deriveEmployeeSummary(recentTasks, summarySource);
    const weeklyProductivity = normalizeEmployeeWeeklyProductivity(weeklyProductivitySource);

    return {
        ...summary,
        recent_tasks: recentTasks,
        notifications: Array.isArray(notificationsSource) ? notificationsSource.map(normalizeEmployeeNotification) : [],
        weekly_productivity: weeklyProductivity,
        weeklyProductivity,
        recent_activity: recentActivity,
        myTasks: summary.my_tasks,
        completedTasks: summary.completed_tasks,
        pendingTasks: summary.pending_tasks,
        overdueTasks: summary.overdue_tasks,
        myProjects: summary.my_projects,
        completionRate: summary.completion_rate,
        completedThisWeek: summary.completed_this_week,
        projectsThisWeek: summary.projects_this_week,
        activeTasks: summary.active_tasks,
        unreadNotificationsCount: summary.unread_notifications_count,
        recentTasks,
        trendData: weeklyProductivity,
        recentActivity,
    };
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    const axiosError = error as AxiosError<unknown>;
    const responseData = axiosError.response?.data;

    if (isRecord(responseData) && typeof responseData.message === 'string') {
        return responseData.message;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
};

export const dashboardService = {
    getStats: async (): Promise<DashboardStats> => {
        try {
            const response = await api.get<DashboardStatsResponse | unknown>('/dashboard/stats');
            return normalizeStats(unwrapPayload(response.data));
        } catch (error) {
            throw makeError(getErrorMessage(error, 'Failed to fetch dashboard stats'), error);
        }
    },

    getWorkload: async (): Promise<WorkloadData[]> => {
        try {
            const response = await api.get<DashboardWorkloadResponse | unknown>('/dashboard/workload');
            const payload = unwrapPayload(response.data);
            const rawWorkload = isRecord(payload) ? payload.employee_workloads ?? payload.employeeWorkloads ?? payload : payload;

            if (!Array.isArray(rawWorkload)) {
                throw makeError('Malformed dashboard workload response');
            }

            return rawWorkload.map((item, index) => normalizeWorkloadItem(item, index));
        } catch (error) {
            throw makeError(getErrorMessage(error, 'Failed to fetch workload data'), error);
        }
    },

    getPerformance: async (): Promise<PerformanceData> => {
        try {
            const response = await api.get<DashboardPerformanceResponse | unknown>('/dashboard/performance');
            return normalizePerformance(unwrapPayload(response.data));
        } catch (error) {
            throw makeError(getErrorMessage(error, 'Failed to fetch performance data'), error);
        }
    },

    getClientAnalytics: async (): Promise<ClientAnalytics> => {
        try {
            const response = await api.get<ClientAnalyticsResponse | unknown>('/dashboard/client-analytics');
            return normalizeClientAnalytics(unwrapPayload(response.data));
        } catch (error) {
            throw makeError(getErrorMessage(error, 'Failed to fetch client analytics'), error);
        }
    },

    getEmployeeDashboard: async (): Promise<EmployeeDashboard> => {
        try {
            const response = await api.get<EmployeeDashboardResponse | unknown>('/employee/dashboard');
            return normalizeEmployeeDashboard(unwrapPayload(response.data));
        } catch (error) {
            const axiosError = error as AxiosError<unknown>;
            const status = axiosError.response?.status;

            if (status === 403) {
                throw makeError('You do not have access to the employee dashboard.', error);
            }

            throw makeError(getErrorMessage(error, 'Failed to fetch employee dashboard'), error);
        }
    },
};
