<?php

namespace App\Http\Controllers\Api\Employee;

use App\Events\TaskStatusChanged;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateTaskStatusRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Services\ActivityLogService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();

        if (! $user->hasRole('admin') && ! $user->hasRole('employee')) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden.',
            ], 403);
        }

        $tasks = Task::query()
            ->with(['project:id,name,status', 'creator:id,name,email'])
            ->whereHas('project', fn ($query) => $query->where('company_id', $user->company_id))
            ->whereHas('users', fn ($query) => $query->whereKey($user->id))
            ->orderByDesc('updated_at')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => TaskResource::collection($tasks),
            'meta' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'per_page' => $tasks->perPage(),
                'total' => $tasks->total(),
            ],
        ]);
    }

    public function updateStatus(UpdateTaskStatusRequest $request, Task $task): JsonResponse
    {
        $user = auth()->user();

        if (! $user->hasRole('employee')) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden.',
            ], 403);
        }

        if (
            ! $task->project ||
            $task->project->company_id !== $user->company_id ||
            ! $task->users()->whereKey($user->id)->exists()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or not assigned to you.',
            ], 404);
        }

        $updatedTask = DB::transaction(function () use ($request, $task, $user) {
            $task->refresh();
            $oldStatus = $task->status;
            $newStatus = $request->status;

            if ($oldStatus !== $newStatus) {
                $task->update(['status' => $newStatus]);

                ActivityLogService::logTaskStatusChanged(
                    $user->id,
                    $task->id,
                    $oldStatus,
                    $newStatus
                );

                $title = $newStatus === 'completed' ? 'Task Completed' : 'Task Status Updated';
                $message = $newStatus === 'completed'
                    ? "Employee {$user->name} has completed task {$task->title}"
                    : "Employee {$user->name} updated task {$task->title} from {$oldStatus} to {$newStatus}";

                NotificationService::notifyCompanyAdminsExcept(
                    $user,
                    $title,
                    $message,
                    $newStatus === 'completed' ? 'task_completed' : 'task_status_updated',
                    'task',
                    $task->id,
                    [
                        'task_id' => $task->id,
                        'task_title' => $task->title,
                        'employee_id' => $user->id,
                        'employee_name' => $user->name,
                        'old_status' => $oldStatus,
                        'new_status' => $newStatus,
                    ]
                );

                event(new TaskStatusChanged($task, $oldStatus, $newStatus, $user));
            }

            return $task->load(['project', 'creator', 'users', 'files']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Task status updated successfully.',
            'data' => new TaskResource($updatedTask),
        ]);
    }
}
