export interface GeneralSettings {
    name: string;
    email: string | null;
    phone: string | null;
}

export interface UpdateGeneralSettingsPayload {
    name: string;
    email?: string | null;
    phone?: string | null;
}

export interface SecuritySettingsPayload {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
}

export interface NotificationSettings {
    task_assigned: boolean;
    task_completed: boolean;
    project_updated: boolean;
    report_generated: boolean;
    employee_joined: boolean;
    invite_accepted: boolean;
}

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string | null;
    status: string | null;
}

export interface TeamSettingsResponse {
    members: TeamMember[];
    totalMembers: number;
}
