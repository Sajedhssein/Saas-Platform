<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use HasFactory, HasUuids, SoftDeletes;
    use \App\Traits\DateFilter;

    protected static function booted(): void
    {
        static::saving(function (Task $task): void {
            $task->progress = $task->statusToProgress($task->status);
        });
    }

    protected $fillable = [
        'project_id',
        'created_by',
        'title',
        'description',
        'status',
        'priority',
        'progress',
        'deadline',
        'estimated_hours',
    ];

    protected $casts = [
        'deadline' => 'datetime',
        'progress' => 'integer',
        'estimated_hours' => 'integer',
    ];

    public function project() {
        return $this->belongsTo(Project::class);
    }

    public function creator() {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function users() {
        return $this->belongsToMany(User::class, 'task_users')
            ->using(TaskUser::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    public function comments() {
        return $this->hasMany(TaskComment::class);
    }

    public function files() {
        return $this->hasMany(TaskFile::class);
    }

    public function responses() {
        return $this->hasMany(TaskResponse::class);
    }

    public function activityLogs() {
        return $this->hasMany(ActivityLog::class, 'entity_id')
            ->where('entity_type', 'Task');
    }

    public function statusToProgress(?string $status): int
    {
        return match ($status) {
            'completed' => 100,
            'in_progress' => 50,
            default => 0,
        };
    }

}
