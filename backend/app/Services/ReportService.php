<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportService
{
    public static function generate(string $companyId, Carbon $start, Carbon $end, string $period): array
    {
        $start = $start->copy()->startOfDay();
        $end = $end->copy()->endOfDay();
        $now = Carbon::now();

        $projectQuery = Project::query()
            ->where('company_id', $companyId)
            ->dateRange($start, $end, 'created_at');

        $taskQuery = Task::query()
            ->whereHas('project', fn ($query) => $query->where('company_id', $companyId))
            ->dateRange($start, $end, 'created_at');

        $employeeQuery = User::query()
            ->where('company_id', $companyId)
            ->whereHas('roles', fn ($query) => $query->whereRaw('LOWER(name) = ?', ['employee']));

        $projectStats = [
            'total' => (clone $projectQuery)->count(),
            'active' => (clone $projectQuery)->where('status', 'active')->count(),
            'pending' => (clone $projectQuery)->where('status', 'pending')->count(),
            'in_progress' => (clone $projectQuery)->where('status', 'in_progress')->count(),
            'completed' => (clone $projectQuery)->where('status', 'completed')->count(),
        ];

        $projectAverageProgress = (int) round((float) ((clone $projectQuery)->avg('progress') ?? 0));

        $taskStatsQuery = clone $taskQuery;
        $taskStats = [
            'total' => (clone $taskStatsQuery)->count(),
            'completed' => (clone $taskStatsQuery)->where('status', 'completed')->count(),
            'in_progress' => (clone $taskStatsQuery)->where('status', 'in_progress')->count(),
            'pending' => (clone $taskStatsQuery)->where('status', 'pending')->count(),
            'overdue' => (clone $taskStatsQuery)
                ->whereNotNull('deadline')
                ->where('deadline', '<', $now)
                ->where('status', '!=', 'completed')
                ->count(),
        ];

        $taskStats['completion_rate'] = $taskStats['total'] > 0
            ? (int) round(($taskStats['completed'] / $taskStats['total']) * 100)
            : 0;

        $topPerformers = DB::table('task_users')
            ->join('tasks', 'task_users.task_id', '=', 'tasks.id')
            ->join('projects', 'tasks.project_id', '=', 'projects.id')
            ->join('users', 'task_users.user_id', '=', 'users.id')
            ->join('user_roles', 'users.id', '=', 'user_roles.user_id')
            ->join('roles', 'user_roles.role_id', '=', 'roles.id')
            ->where('projects.company_id', $companyId)
            ->whereRaw('LOWER(roles.name) = ?', ['employee'])
            ->where('tasks.status', 'completed')
            ->whereBetween('tasks.updated_at', [$start, $end])
            ->groupBy('users.id', 'users.name')
            ->orderByRaw('COUNT(*) DESC')
            ->limit(5)
            ->get([
                'users.id',
                'users.name',
                DB::raw('COUNT(*) as completed_tasks'),
            ])
            ->map(fn ($row) => [
                'id' => $row->id,
                'name' => $row->name,
                'completed_tasks' => (int) $row->completed_tasks,
            ])
            ->values();

        $activeEmployeeCount = DB::table('task_users')
            ->join('tasks', 'task_users.task_id', '=', 'tasks.id')
            ->join('projects', 'tasks.project_id', '=', 'projects.id')
            ->join('users', 'task_users.user_id', '=', 'users.id')
            ->join('user_roles', 'users.id', '=', 'user_roles.user_id')
            ->join('roles', 'user_roles.role_id', '=', 'roles.id')
            ->where('projects.company_id', $companyId)
            ->whereRaw('LOWER(roles.name) = ?', ['employee'])
            ->whereBetween('tasks.created_at', [$start, $end])
            ->distinct()
            ->count('users.id');

        $employees = [
            'total' => $employeeQuery->count(),
            'active_this_week' => $activeEmployeeCount,
            'top_performers' => $topPerformers,
        ];

        return [
            'period' => $period,
            'projects' => $projectStats,
            'tasks' => $taskStats,
            'employees' => $employees,
            'performance' => [
                'average_project_progress' => $projectAverageProgress,
            ],
        ];
    }
}
