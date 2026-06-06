export interface ProjectStats {
    total: number;
    active: number;
    completed: number;
}

export interface TaskStats {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
    overdue: number;
    completion_rate: number;
}

export interface TopPerformer {
    id: string;
    name: string;
    completed_tasks: number;
}

export interface EmployeeStats {
    total: number;
    active_this_week?: number;
    active_this_period?: number;
    top_performers: TopPerformer[];
}

export interface PerformanceStats {
    average_project_progress: number;
}

export interface ReportResponse {
    period: 'weekly' | 'monthly' | 'custom' | string;
    projects: ProjectStats;
    tasks: TaskStats;
    employees: EmployeeStats;
    performance: PerformanceStats;
}

export interface ReportEnvelope {
    success?: boolean;
    data?: ReportResponse | null;
    message?: string;
}

export type ReportType = 'company' | 'project' | 'employee' | 'client';

export type ReportFormat = 'pdf' | 'xlsx' | 'csv';

export type ReportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'sent' | 'ready';

export interface ReportRecord {
    id: string;
    title: string;
    report_type: ReportType;
    format: ReportFormat;
    status: ReportStatus | string;
    recipient_email: string | null;
    generated_at: string | null;
    sent_at: string | null;
    file_path: string | null;
    project_name?: string | null;
    project_id?: string | null;
    employee_id?: string | null;
    client_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    summary?: string | null;
    progress?: number | null;
    task_statistics?: {
        total?: number | null;
        completed?: number | null;
        pending?: number | null;
        in_progress?: number | null;
        overdue?: number | null;
        [key: string]: number | null | undefined;
    } | null;
    notes?: string | null;
    recommendations?: string | null;
    generated_by?: string | null;
}

export interface ReportCollectionEnvelope {
    success?: boolean;
    data?: ReportRecord[] | { data?: ReportRecord[] } | null;
    message?: string;
}

export interface ReportRecordEnvelope {
    success?: boolean;
    data?: ReportRecord | null;
    message?: string;
}

export interface GenerateReportPayload {
    report_type: ReportType;
    format: ReportFormat;
    title: string;
    start_date?: string | null;
    end_date?: string | null;
    project_id?: string | null;
    employee_id?: string | null;
    client_id?: string | null;
    recipient_email?: string | null;
}

export interface EmailReportPayload {
    email: string;
}
