<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        $roles = $this->relationLoaded('roles')
            ? $this->roles->pluck('name')
            : $this->roles()->pluck('name');

        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatar' => $this->avatar_url,
            'avatar_url' => $this->avatar_url,
            'department' => $this->department,
            'position' => $this->position,
            'is_active' => $this->is_active,
            'status' => $this->status,
            'role' => $roles->first(),
            'roles' => $roles,
            'company_name' => $this->company?->name,
            'first_login_at' => $this->first_login_at?->toDateTimeString(),
            'last_login_at' => $this->last_login_at?->toDateTimeString(),
            'show_welcome' => $this->first_login_at === null,
            'projects_count' => isset($this->projects_count) ? (int) $this->projects_count : null,
            'total_assigned_tasks' => isset($this->total_assigned_tasks) ? (int) $this->total_assigned_tasks : null,
            'completed_tasks' => isset($this->completed_tasks) ? (int) $this->completed_tasks : null,
            'in_progress_tasks' => isset($this->in_progress_tasks) ? (int) $this->in_progress_tasks : null,
            'pending_tasks' => isset($this->pending_tasks) ? (int) $this->pending_tasks : null,
            'todo_tasks' => isset($this->pending_tasks) ? (int) $this->pending_tasks : null,
            'completion_rate' => isset($this->total_assigned_tasks) && (int) $this->total_assigned_tasks > 0
                ? round(((int) ($this->completed_tasks ?? 0) / (int) $this->total_assigned_tasks) * 100, 1)
                : 0,
            'active_tasks' => $this->whenLoaded('activeTasks', function () {
                return $this->activeTasks->map(fn ($task) => [
                    'id' => $task->id,
                    'title' => $task->title,
                    'status' => $task->status,
                    'progress' => (int) $task->progress,
                    'deadline' => $task->deadline?->toDateTimeString(),
                    'project' => $task->project ? [
                        'id' => $task->project->id,
                        'name' => $task->project->name,
                    ] : null,
                ])->values();
            }),
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
