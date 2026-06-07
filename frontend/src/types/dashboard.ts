import type { ActivityLog } from './activity';

export type ProjectStatus = 'pending' | 'in-progress' | 'completed' | 'on-hold';

export type EmployeeTaskStatus = 'pending' | 'in-progress' | 'completed' | 'overdue';

export interface AnalyticsKPI {
    title: string;
    value: number;
    subtitle: string;
    tone: 'blue' | 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate';
}

export interface ProjectProgress {
    id: string;
    name: string;
    progress: number;
    status: ProjectStatus;
}

export interface WeeklyProductivityItem {
    day: string;
    completed: number;
}

export interface DashboardStats {
    total_projects: number;
    active_projects: number;
    completed_projects: number;
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    total_employees: number;
    active_employees: number;
    project_completion_rate: number;
    project_progress: ProjectProgress[];
    weekly_productivity: WeeklyProductivityItem[];
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    totalEmployees: number;
    activeEmployees: number;
    projectCompletionRate: number;
    taskCompletionPercentage: number;
    delayedTasks: number;
    projectProgress: ProjectProgress[];
    weeklyProductivity: WeeklyProductivityItem[];
    recentActivity: ActivityLog[];
    recent_activity: ActivityLog[];
}

export interface WorkloadData {
    employee_id: string;
    employee_name: string;
    assigned_tasks: number;
    completed_tasks: number;
    workload_percentage: number;
    employeeId: string;
    employeeName: string;
    totalAssignedTasks: number;
    completedTasks: number;
    workloadPercentage: number;
}

export interface TopPerformer {
    id: string;
    name: string;
    completed_tasks: number;
    completedTasks: number;
}

export interface PerformanceData {
    weekly_productivity: number;
    average_task_completion: number;
    overdue_tasks: number;
    top_performers: TopPerformer[];
    weeklyProductivity: number;
    averageTaskCompletion: number;
    overdueTasks: number;
    topPerformers: TopPerformer[];
}

export interface TopClient {
    id: string;
    name: string;
    projects_count: number;
    completed_projects: number;
}

export interface ProjectDistribution {
    active: number;
    completed: number;
    pending: number;
}

export interface ClientAnalytics {
    total_clients: number;
    new_this_month: number;
    active_clients: number;
    inactive_clients: number;
    top_clients: TopClient[];
    project_distribution: ProjectDistribution;
}

export interface EmployeeTaskProject {
    id: string;
    name: string;
}

export interface EmployeeDashboardTask {
    id: string;
    title: string;
    description: string;
    status: EmployeeTaskStatus;
    progress: number;
    deadline: string | null;
    project: EmployeeTaskProject;
    priority?: string | null;
}

export interface EmployeeWeeklyProductivityItem {
    day: string;
    completed: number;
}

export interface EmployeeDashboardNotification {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    timestamp: string;
    entity_type?: string | null;
    entity_id?: string | null;
}

export interface EmployeeDashboardSummary {
    my_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    overdue_tasks: number;
    my_projects: number;
    completion_rate: number;
    completed_this_week: number;
    projects_this_week: number;
    active_tasks: number;
    unread_notifications_count: number;
    myTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    myProjects: number;
    completionRate: number;
    completedThisWeek: number;
    projectsThisWeek: number;
    activeTasks: number;
    unreadNotificationsCount: number;
}

export interface EmployeeDashboard {
    my_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    overdue_tasks: number;
    my_projects: number;
    completion_rate: number;
    completed_this_week: number;
    projects_this_week: number;
    active_tasks: number;
    unread_notifications_count: number;
    recent_tasks: EmployeeDashboardTask[];
    notifications: EmployeeDashboardNotification[];
    weekly_productivity?: EmployeeWeeklyProductivityItem[];
    weeklyProductivity?: EmployeeWeeklyProductivityItem[];
    myTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    myProjects: number;
    completionRate: number;
    completedThisWeek: number;
    projectsThisWeek: number;
    activeTasks: number;
    unreadNotificationsCount: number;
    recentTasks: EmployeeDashboardTask[];
    trendData?: EmployeeWeeklyProductivityItem[];
    recentActivity: ActivityLog[];
    recent_activity: ActivityLog[];
}

export interface DashboardStatsResponse {
    data: DashboardStats;
    success: boolean;
    message?: string;
}

export interface DashboardWorkloadResponse {
    data: WorkloadData[];
    success: boolean;
    message?: string;
}

export interface DashboardPerformanceResponse {
    data: PerformanceData;
    success: boolean;
    message?: string;
}

export interface ClientAnalyticsResponse {
    data?: ClientAnalytics | ClientAnalytics[] | null;
    success?: boolean;
    message?: string;
}

export interface EmployeeDashboardResponse {
    data?: EmployeeDashboard | null;
    success?: boolean;
    message?: string;
}

export type WorkloadEmployee = WorkloadData;
export type PerformanceEmployee = TopPerformer;
