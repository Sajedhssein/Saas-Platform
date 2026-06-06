<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;

class ProjectStatusSyncService
{
    public static function sync(Project|int|string $project): void
    {
        $projectId = $project instanceof Project ? $project->id : $project;

        if (empty($projectId)) {
            return;
        }

        $taskStats = Task::query()
            ->where('project_id', $projectId)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed', ['completed'])
            ->selectRaw('SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as started', ['in_progress', 'completed'])
            ->first();

        if (! $taskStats) {
            return;
        }

        $status = self::resolveStatus((int) $taskStats->total, (int) $taskStats->started, (int) $taskStats->completed);

        if ($status !== null) {
            Project::where('id', $projectId)
                ->where('status', '!=', $status)
                ->update(['status' => $status]);
        }
    }

    public static function resolveStatus(int $total, int $started, int $completed): string
    {
        if ($total === 0 || $started === 0) {
            return 'pending';
        }

        if ($completed === $total) {
            return 'completed';
        }

        return 'in_progress';
    }
}
