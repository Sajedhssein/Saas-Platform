<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use HasUuids;
    use \App\Traits\DateFilter;

    protected $fillable = [
        'company_id',
        'project_id',
        'task_id',
        'user_id',
        'action',
        'entity_type',
        'entity_id',
        'metadata',
        'old_values',
        'new_values',
        'description',
        'ip_address',
    ];

    protected $casts = [
        'company_id' => 'string',
        'project_id' => 'string',
        'task_id' => 'string',
        'entity_id' => 'string',
        'metadata' => 'array',
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $activityLog): void {
            if ($activityLog->company_id) {
                return;
            }

            if ($activityLog->user_id && $user = User::query()->find($activityLog->user_id)) {
                $activityLog->company_id = $user->company_id;
                return;
            }

            if ($activityLog->task_id && $task = Task::query()->with('project')->find($activityLog->task_id)) {
                $activityLog->project_id ??= $task->project_id;
                $activityLog->company_id = $task->project?->company_id;
                return;
            }

            if ($activityLog->project_id && $project = Project::query()->find($activityLog->project_id)) {
                $activityLog->company_id = $project->company_id;
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function user(): BelongsTo{
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Scope to get logs for a specific task
     */
    public function scopeForTask($query, $taskId)
    {
        return $query->where(function ($query) use ($taskId) {
            $query->where('task_id', $taskId)
                ->orWhere(function ($query) use ($taskId) {
                    $query->where('entity_type', 'Task')
                        ->where('entity_id', $taskId);
                });
        });
    }

    /**
     * Scope to get latest logs first
     */
    public function scopeLatestFirst($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    public function scopeForCompany($query, string $companyId)
    {
        return $query->where('company_id', $companyId);
    }

}
