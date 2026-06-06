<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    /**
     * Get all activity logs
     * Admin can view all logs
     * Non-admin can only view logs related to tasks they're assigned to
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $perPage = 20;

        $query = ActivityLog::query()
            ->forCompany($user->company_id)
            ->with('user');

        // Non-admin users can only see logs for tasks they're involved in or their own actions
        if (!$user->hasRole('admin')) {
            $assignedTaskIds = $user->tasks()
                ->pluck('tasks.id')
                ->toArray();

            $query->where(function ($query) use ($assignedTaskIds, $user) {
                $query->where('user_id', $user->id)
                    ->orWhere(function ($query) use ($assignedTaskIds) {
                        $query->whereIn('task_id', $assignedTaskIds)
                            ->orWhere(function ($query) use ($assignedTaskIds) {
                                $query->whereIn('entity_id', $assignedTaskIds)
                                    ->where('entity_type', 'Task');
                            });
                    });
            });
        }

        // Apply optional date filters on logs
        $query->applyRequestRange($request, 'created_at');

        $logs = $query->latestFirst()
            ->paginate($perPage);

        return response()->json([
            'data' => ActivityLogResource::collection($logs->items()),
            'pagination' => [
                'total' => $logs->total(),
                'per_page' => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'from' => $logs->firstItem(),
                'to' => $logs->lastItem(),
                'has_more' => $logs->hasMorePages(),
            ],
        ]);
    }

    /**
     * Get activity logs for a specific task
     * Only users related to that task can access
     */
    public function taskLogs(Task $task): JsonResponse
    {
        $user = auth()->user();

        if ($task->project && $task->project->company_id !== $user->company_id) {
            return response()->json([
                'message' => 'Unauthorized to view logs for this task',
            ], 404);
        }

        // Check if user is related to this task (assigned or is creator)
        $isRelated = $task->users()->where('user_id', $user->id)->exists()
            || $task->created_by === $user->id;

        if (!$isRelated && !$user->hasRole('admin')) {
            return response()->json([
                'message' => 'Unauthorized to view logs for this task',
            ], 403);
        }

        $perPage = 20;

        $logs = ActivityLog::query()
            ->forCompany($user->company_id)
            ->forTask($task->id)
            ->with('user')
            ->latestFirst()
            ->paginate($perPage);

        return response()->json([
            'task_id' => $task->id,
            'data' => ActivityLogResource::collection($logs->items()),
            'pagination' => [
                'total' => $logs->total(),
                'per_page' => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'from' => $logs->firstItem(),
                'to' => $logs->lastItem(),
                'has_more' => $logs->hasMorePages(),
            ],
        ]);
    }
}
