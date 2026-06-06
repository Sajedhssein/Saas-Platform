export interface ActivityUser {
    id: string;
    name: string;
    avatar?: string | null;
}

export type ActivityMetadata = Record<string, unknown>;

export interface ActivityLog {
    id: string;
    action: string;
    description: string;
    metadata?: ActivityMetadata | null;
    user?: ActivityUser | null;
    created_at: string;
}

export interface ActivityLogPagination {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    has_more: boolean;
}

export interface ActivityLogFeed {
    logs: ActivityLog[];
    pagination?: ActivityLogPagination;
    taskId?: string | null;
}