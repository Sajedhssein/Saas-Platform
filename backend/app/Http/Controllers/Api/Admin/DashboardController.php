<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics
     */
    public function stats(Request $request): JsonResponse
    {
        $user = auth()->user();

        if (! $user->hasRole('admin')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $companyId = $user->company_id;

        $projectQuery = Project::where('company_id', $companyId)
            ->applyRequestRange($request, 'created_at');

        $taskBase = Task::whereHas('project', fn($q) => $q->where('company_id', $companyId));
        $taskQuery = (clone $taskBase)->applyRequestRange($request, 'created_at');

        [$startRange, $endRange] = Project::parseRangeFromRequest($request);

        $totalProjects = $projectQuery->count();
        $totalTasks = $taskQuery->count();
        $completedTasks = (clone $taskQuery)
            ->where('status', 'completed')
            ->dateRange($startRange, $endRange, 'updated_at')
            ->count();

        $taskCompletionPercentage = $totalTasks > 0
            ? round(($completedTasks / $totalTasks) * 100, 2)
            : 0;

        $delayedTaskQuery = (clone $taskBase)
            ->whereNotNull('deadline')
            ->where('deadline', '<', now())
            ->where('status', '!=', 'completed')
            ->applyRequestRange($request, 'deadline');

        $delayedTasks = $delayedTaskQuery->get(['id', 'project_id', 'title', 'status', 'deadline', 'created_at'])
            ->map(fn($task) => [
                'id' => $task->id,
                'project_id' => $task->project_id,
                'title' => $task->title,
                'status' => $task->status,
                'deadline' => $task->deadline?->toDateTimeString(),
                'created_at' => $task->created_at?->toDateTimeString(),
            ]);

        $projectProgressOverview = Project::where('company_id', $companyId)
            ->withCount([
                'tasks as total_tasks',
                'tasks as completed_tasks' => fn($query) => $query->where('status', 'completed'),
            ])
            ->get()
            ->map(fn($project) => [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'total_tasks' => $project->total_tasks,
                'completed_tasks' => $project->completed_tasks,
                'progress_percentage' => $project->total_tasks > 0
                    ? round(($project->completed_tasks / $project->total_tasks) * 100, 2)
                    : 0,
            ]);

        $completionColumn = Schema::hasColumn('tasks', 'completed_at') ? 'tasks.completed_at' : 'tasks.updated_at';
        $start = now()->startOfDay()->subDays(6);
        $end = now()->endOfDay();

        $completionByDate = Task::query()
            ->join('projects', 'projects.id', '=', 'tasks.project_id')
            ->where('projects.company_id', $companyId)
            ->where('tasks.status', 'completed')
            ->whereBetween($completionColumn, [$start, $end])
            ->selectRaw('DATE('.$completionColumn.') as completed_date, COUNT(*) as completed_count')
            ->groupBy(DB::raw('DATE('.$completionColumn.')'))
            ->pluck('completed_count', 'completed_date');

        $weeklyProductivity = collect([
            'Mon' => 0,
            'Tue' => 0,
            'Wed' => 0,
            'Thu' => 0,
            'Fri' => 0,
            'Sat' => 0,
            'Sun' => 0,
        ]);

        foreach ($completionByDate as $date => $count) {
            $day = Carbon::parse($date)->format('D');

            if ($weeklyProductivity->has($day)) {
                $weeklyProductivity[$day] += (int) $count;
            }
        }

        $stats = [
            'total_projects' => $totalProjects,
            'total_tasks' => $totalTasks,
            'total_users' => User::where('company_id', $companyId)->count(),
            'active_tasks' => (clone $taskQuery)->whereIn('status', ['pending', 'in_progress'])->count(),
            'completed_tasks' => $completedTasks,
            'overdue_tasks' => (clone $taskBase)
                ->where('deadline', '<', now())
                ->where('status', '!=', 'completed')
                ->count(),
            'task_completion_percentage' => $taskCompletionPercentage,
            'delayed_tasks_count' => $delayedTasks->count(),
            'delayed_tasks' => $delayedTasks,
            'project_progress_overview' => $projectProgressOverview,
            'weekly_productivity' => $weeklyProductivity
                ->map(fn($completed, $day) => [
                    'day' => $day,
                    'completed' => $completed,
                ])
                ->values(),
            'recent_activity' => ActivityLogResource::collection(
                ActivityLog::query()
                    ->forCompany($companyId)
                    ->with('user:id,name,email,avatar_url')
                    ->latestFirst()
                    ->limit(8)
                    ->get()
            ),
        ];

        return response()->json($stats);
    }

    /**
     * Get workload analytics
     */
    public function workload(): JsonResponse
    {
        $user = auth()->user();

        if (! $user->hasRole('admin')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $companyId = $user->company_id;

        $userWorkloads = User::where('company_id', $companyId)
            ->whereHas('roles', fn($q) => $q->where('name', 'employee'))
            ->withCount([
                'tasks as total_assigned_tasks' => fn($query) => $query->whereHas('project', fn($q) => $q->where('company_id', $companyId)),
                'tasks as pending_tasks' => fn($query) => $query->where('status', 'pending')->whereHas('project', fn($q) => $q->where('company_id', $companyId)),
                'tasks as in_progress_tasks' => fn($query) => $query->where('status', 'in_progress')->whereHas('project', fn($q) => $q->where('company_id', $companyId)),
                'tasks as completed_tasks' => fn($query) => $query->where('status', 'completed')->whereHas('project', fn($q) => $q->where('company_id', $companyId)),
            ])
            ->get()
            ->map(fn($user) => [
                'employee_id' => $user->id,
                'employee_name' => $user->name,
                'total_assigned_tasks' => $user->total_assigned_tasks,
                'pending_tasks' => $user->pending_tasks,
                'in_progress_tasks' => $user->in_progress_tasks,
                'completed_tasks' => $user->completed_tasks,
            ]);

        return response()->json([
            'employee_workloads' => $userWorkloads,
        ]);
    }

    /**
     * Get performance analytics
     */
    public function performance(): JsonResponse
    {
        $user = auth()->user();

        if (! $user->hasRole('admin')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $companyId = $user->company_id;

        $performanceMetrics = User::where('company_id', $companyId)
            ->whereHas('roles', fn($q) => $q->where('name', 'employee'))
            ->withCount([
                'tasks as total_assigned_tasks' => fn($query) => $query->whereHas('project', fn($q) => $q->where('company_id', $companyId)),
                'tasks as completed_tasks' => fn($query) => $query->where('status', 'completed')->whereHas('project', fn($q) => $q->where('company_id', $companyId)),
                'tasks as overdue_tasks' => fn($query) => $query->whereNotNull('deadline')->where('status', '!=', 'completed')->where('deadline', '<', now())->whereHas('project', fn($q) => $q->where('company_id', $companyId)),
            ])
            ->with(['tasks' => fn($query) => $query->where('status', 'completed')->whereHas('project', fn($q) => $q->where('company_id', $companyId))])
            ->orderByDesc('completed_tasks')
            ->get()
            ->map(function ($user) {
                $completedTasks = $user->completed_tasks;
                $totalTasks = $user->total_assigned_tasks;
                $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 2) : 0;

                $averageCompletionTime = 0;
                if ($completedTasks > 0) {
                    $totalDays = $user->tasks->sum(fn($task) => $task->created_at->diffInDays($task->updated_at));
                    $averageCompletionTime = round($totalDays / $completedTasks, 2);
                }

                return [
                    'employee_id' => $user->id,
                    'employee_name' => $user->name,
                    'completed_tasks' => $completedTasks,
                    'overdue_tasks' => $user->overdue_tasks,
                    'completion_rate' => $completionRate,
                    'average_completion_time' => $averageCompletionTime,
                ];
            });

        return response()->json([
            'employee_performance' => $performanceMetrics,
        ]);
    }

    /**
     * Get client analytics
     */
    public function clientAnalytics(): JsonResponse
    {
        $user = auth()->user();

        if (! $user->hasRole('admin')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $companyId = $user->company_id;
        $recentActivityThreshold = now()->subDays(30);

        $clientBaseQuery = $this->clientBaseQuery($companyId);
        $projectCountsSubquery = $this->clientProjectCountsSubquery($companyId);
        $activityCountsSubquery = $this->clientActivityCountsSubquery($companyId, $recentActivityThreshold);

        $totalClients = (clone $clientBaseQuery)->count(DB::raw('DISTINCT users.id'));
        $newThisMonth = (clone $clientBaseQuery)
            ->whereBetween('users.created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->count(DB::raw('DISTINCT users.id'));

        $activeClients = (clone $clientBaseQuery)
            ->where('users.is_active', true)
            ->count(DB::raw('DISTINCT users.id'));

        $inactiveClients = (clone $clientBaseQuery)
            ->where('users.is_active', false)
            ->count(DB::raw('DISTINCT users.id'));

        $topClients = (clone $clientBaseQuery)
            ->leftJoinSub($projectCountsSubquery, 'project_counts', 'users.id', '=', 'project_counts.user_id')
            ->selectRaw('users.id, users.name, COALESCE(project_counts.projects_count, 0) as projects_count, COALESCE(project_counts.completed_projects, 0) as completed_projects')
            ->orderByRaw('COALESCE(project_counts.projects_count, 0) DESC')
            ->orderBy('users.name')
            ->limit(5)
            ->get()
            ->map(fn ($client) => [
                'id' => $client->id,
                'name' => $client->name,
                'projects_count' => (int) $client->projects_count,
                'completed_projects' => (int) $client->completed_projects,
            ])
            ->values();

        $growthStart = now()->startOfMonth()->subMonths(5);
        $growthEnd = now()->endOfMonth();
        [$growthMonthSelect, $growthMonthGroup] = $this->clientGrowthMonthExpressions();

        $growthCounts = (clone $clientBaseQuery)
            ->whereBetween('users.created_at', [$growthStart, $growthEnd])
            ->selectRaw("{$growthMonthSelect} as month_key, COUNT(DISTINCT users.id) as count")
            ->groupByRaw($growthMonthGroup)
            ->pluck('count', 'month_key');

        $growth = [];
        for ($offset = 5; $offset >= 0; $offset--) {
            $month = now()->startOfMonth()->subMonths($offset);

            $growth[] = [
                'month' => $month->format('M'),
                'count' => (int) ($growthCounts[$month->format('Y-m')] ?? 0),
            ];
        }

        $activeProjectClients = (clone $clientBaseQuery)
            ->leftJoinSub($projectCountsSubquery, 'project_counts', 'users.id', '=', 'project_counts.user_id')
            ->whereRaw('COALESCE(project_counts.active_projects, 0) > 0')
            ->count(DB::raw('DISTINCT users.id'));

        $completedProjectClients = (clone $clientBaseQuery)
            ->leftJoinSub($projectCountsSubquery, 'project_counts', 'users.id', '=', 'project_counts.user_id')
            ->whereRaw('COALESCE(project_counts.active_projects, 0) = 0 AND COALESCE(project_counts.completed_projects, 0) > 0')
            ->count(DB::raw('DISTINCT users.id'));

        $projectDistribution = [
            'active' => $activeProjectClients,
            'completed' => $completedProjectClients,
            'pending' => max(0, $totalClients - $activeProjectClients - $completedProjectClients),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'total_clients' => $totalClients,
                'new_this_month' => $newThisMonth,
                'active_clients' => $activeClients,
                'inactive_clients' => $inactiveClients,
                'top_clients' => $topClients,
                'growth' => $growth,
                'project_distribution' => $projectDistribution,
            ],
        ]);
    }

    private function clientBaseQuery(string $companyId)
    {
        return User::query()
            ->join('user_roles', 'users.id', '=', 'user_roles.user_id')
            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
            ->where('users.company_id', $companyId)
            ->whereNull('users.deleted_at')
            ->where('roles.name', Role::CLIENT);
    }

    private function clientProjectCountsSubquery(string $companyId)
    {
        return DB::table('project_users')
            ->join('projects', 'projects.id', '=', 'project_users.project_id')
            ->where('projects.company_id', $companyId)
            ->whereNull('projects.deleted_at')
            ->groupBy('project_users.user_id')
            ->selectRaw(
                'project_users.user_id, COUNT(*) as projects_count, SUM(CASE WHEN projects.status = ? THEN 1 ELSE 0 END) as completed_projects, SUM(CASE WHEN projects.status = ? THEN 1 ELSE 0 END) as active_projects',
                ['completed', 'active']
            );
    }

    private function clientActivityCountsSubquery(string $companyId, Carbon $recentActivityThreshold)
    {
        return DB::table('activity_logs')
            ->where('company_id', $companyId)
            ->where('created_at', '>=', $recentActivityThreshold)
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->selectRaw('user_id, COUNT(*) as recent_activity_count');
    }

    private function clientGrowthMonthExpressions(): array
    {
        $driver = DB::connection()->getDriverName();

        return match ($driver) {
            'sqlite' => ["strftime('%Y-%m', users.created_at)", "strftime('%Y-%m', users.created_at)"],
            'mysql', 'mariadb' => ["DATE_FORMAT(users.created_at, '%Y-%m')", "DATE_FORMAT(users.created_at, '%Y-%m')"],
            default => ["to_char(date_trunc('month', users.created_at), 'YYYY-MM')", "date_trunc('month', users.created_at)"],
        };
    }
}
