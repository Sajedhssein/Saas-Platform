<?php

namespace App\Observers;

use App\Models\Task;
use App\Services\ProjectStatusSyncService;

class TaskObserver
{
    public function saved(Task $task): void
    {
        $originalProjectId = $task->getOriginal('project_id');

        if ($originalProjectId && $originalProjectId !== $task->project_id) {
            ProjectStatusSyncService::sync($originalProjectId);
        }

        ProjectStatusSyncService::sync($task->project_id);
    }

    public function deleted(Task $task): void
    {
        ProjectStatusSyncService::sync($task->project_id);
    }

    public function restored(Task $task): void
    {
        ProjectStatusSyncService::sync($task->project_id);
    }
}
