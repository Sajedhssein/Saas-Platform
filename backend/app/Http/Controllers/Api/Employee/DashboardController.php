<?php

namespace App\Http\Controllers\Api\Employee;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Http\Resources\NotificationResource;
use App\Models\ActivityLog;
use App\Models\Task;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = auth()->user();

        if (! $user->hasRole('admin') && ! $user->hasRole('employee')) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden',
            ], 403);
        }

        $taskQuery = Task::query()
            ->whereHas('project', fn ($query) => $query->where('company_id', $user->company_id))
            ->whereHas('users', fn ($query) => $query->whereKey($user->id))
            ->with(['project:id,name,status', 'creator:id,name'])
            ->orderByDesc('updated_at');

        $assignedTasks = (clone $taskQuery)->get();
        $completedTasks = (clone $taskQuery)->where('status', 'completed')->count();
        $inProgressTasks = (clone $taskQuery)->where('status', 'in_progress')->count();
        $pendingTasks = (clone $taskQuery)->where('status', 'pending')->count();
        $weekStart = now()->startOfWeek();
        $weekEnd = now()->endOfWeek();
        $completedThisWeek = (clone $taskQuery)
            ->where('status', 'completed')
            ->whereBetween('updated_at', [$weekStart, $weekEnd])
            ->count();
        $projectsThisWeek = (clone $taskQuery)
            ->whereBetween('updated_at', [$weekStart, $weekEnd])
            ->distinct('project_id')
            ->count('project_id');
        $overdueTasks = (clone $taskQuery)
            ->whereNotNull('deadline')
            ->where('deadline', '<', now())
            ->where('status', '!=', 'completed')
            ->count();

        $upcomingTasks = (clone $taskQuery)
            ->whereNotNull('deadline')
            ->whereBetween('deadline', [now(), now()->addDays(7)])
            ->where('status', '!=', 'completed')
            ->limit(5)
            ->get()
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'status' => $task->status,
                'deadline' => $task->deadline?->toDateTimeString(),
                'project' => $task->project ? [
                    'id' => $task->project->id,
                    'name' => $task->project->name,
                ] : null,
            ]);

        $recentTasks = $assignedTasks
            ->take(5)
            ->values()
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'status' => $task->status,
                'progress' => $task->progress,
                'deadline' => $task->deadline?->toDateTimeString(),
                'project' => $task->project ? [
                    'id' => $task->project->id,
                    'name' => $task->project->name,
                    'status' => $task->project->status,
                ] : null,
            ]);

        $weeklyProductivity = collect(range(0, 6))->map(function (int $offset) use ($taskQuery) {
            $date = now()->startOfWeek()->addDays($offset);
            $start = $date->copy()->startOfDay();
            $end = $date->copy()->endOfDay();

            return [
                'day' => $date->format('D'),
                'completed' => (clone $taskQuery)
                    ->where('status', 'completed')
                    ->whereBetween('updated_at', [$start, $end])
                    ->count(),
            ];
        });

        $notifications = NotificationService::visibleQueryForUser($user)
            ->whereIn('type', ['task_assigned', 'task_status_changed', 'task_status_updated', 'task_completed', 'admin_message'])
            ->orderByDesc('created_at')
            ->limit(8)
            ->get();

        $assignedTaskIds = $user->tasks()
            ->whereHas('project', fn ($query) => $query->where('company_id', $user->company_id))
            ->pluck('tasks.id');

        $recentActivity = ActivityLog::query()
            ->forCompany($user->company_id)
            ->with('user:id,name,email,avatar_url')
            ->where(function ($query) use ($assignedTaskIds, $user) {
                $query->where('user_id', $user->id)
                    ->orWhereIn('task_id', $assignedTaskIds)
                    ->orWhere(function ($entityQuery) use ($assignedTaskIds) {
                        $entityQuery->where('entity_type', 'Task')
                            ->whereIn('entity_id', $assignedTaskIds);
                    });
            })
            ->latestFirst()
            ->limit(8)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => [
                    'total_assigned_tasks' => $assignedTasks->count(),
                    'completed_tasks' => $completedTasks,
                    'in_progress_tasks' => $inProgressTasks,
                    'pending_tasks' => $pendingTasks,
                    'overdue_tasks' => $overdueTasks,
                    'completed_this_week' => $completedThisWeek,
                    'projects_this_week' => $projectsThisWeek,
                    'active_tasks' => $pendingTasks + $inProgressTasks,
                ],
                'upcoming_tasks' => $upcomingTasks,
                'recent_tasks' => $recentTasks,
                'weekly_productivity' => $weeklyProductivity,
                'notifications' => NotificationResource::collection($notifications),
                'unread_notifications_count' => NotificationService::getUnreadCount($user),
                'recent_activity' => ActivityLogResource::collection($recentActivity),
            ],
        ]);
    }
}
