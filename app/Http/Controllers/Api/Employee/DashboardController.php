<?php

namespace App\Http\Controllers\Api\Employee;

use App\Http\Controllers\Controller;
use App\Models\Task;
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

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => [
                    'total_assigned_tasks' => $assignedTasks->count(),
                    'completed_tasks' => $completedTasks,
                    'in_progress_tasks' => $inProgressTasks,
                    'pending_tasks' => $pendingTasks,
                    'overdue_tasks' => $overdueTasks,
                ],
                'upcoming_tasks' => $upcomingTasks,
                'recent_tasks' => $recentTasks,
            ],
        ]);
    }
}
