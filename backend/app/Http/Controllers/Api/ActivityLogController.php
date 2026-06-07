<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use App\Models\Report;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    private const ADMIN_PERIODS = ['today', 'weekly', 'monthly', 'all'];

    /**
     * Get all activity logs
     * Admin can view all logs
     * Non-admin can only view logs related to tasks they're assigned to
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $perPage = min(max((int) $request->query('per_page', 20), 1), 50);

        $query = ActivityLog::query()
            ->forCompany($user->company_id)
            ->with(['user', 'project', 'task']);

        if ($user->hasRole('employee')) {
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
        } elseif ($user->hasRole('client')) {
            $projectIds = $user->ownedProjects()
                ->pluck('projects.id')
                ->merge($user->projects()->pluck('projects.id'))
                ->unique()
                ->values();

            $taskIds = Task::query()
                ->whereIn('project_id', $projectIds)
                ->pluck('id');

            $reportIds = Report::query()
                ->where('company_id', $user->company_id)
                ->where('recipient_email', $user->email)
                ->pluck('id');

            $query->where(function ($query) use ($projectIds, $taskIds, $reportIds, $user) {
                $query->where('user_id', $user->id)
                    ->orWhereIn('project_id', $projectIds)
                    ->orWhereIn('task_id', $taskIds)
                    ->orWhere(function ($reportQuery) use ($reportIds) {
                        $reportQuery->where('entity_type', 'Report')
                            ->whereIn('entity_id', $reportIds);
                    });
            })->whereIn('action', [
                'project_updated',
                'project_completed',
                'report_generated',
                'report_viewed',
                'FILE_UPLOADED',
                'file_uploaded',
                'file_deleted',
            ]);
        } elseif (! $user->hasRole('admin')) {
            $query->where('user_id', $user->id);
        }

        if ($user->hasRole('admin')) {
            $this->applyAdminPeriodFilter($query, (string) $request->query('period', 'all'));
        } else {
            $query->applyRequestRange($request, 'created_at');
        }

        $this->applySearch($query, trim((string) $request->query('search', '')), $user->company_id);

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

    public function clear(Request $request): JsonResponse
    {
        $user = auth()->user();

        if (! $user->hasRole('admin')) {
            return response()->json([
                'message' => 'Only admins can clear activity logs.',
            ], 403);
        }

        $deletedCount = ActivityLog::query()
            ->forCompany($user->company_id)
            ->delete();

        return response()->json([
            'message' => 'Activity logs cleared.',
            'deleted_count' => $deletedCount,
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

    private function applyAdminPeriodFilter($query, string $period): void
    {
        if (! in_array($period, self::ADMIN_PERIODS, true) || $period === 'all') {
            return;
        }

        $now = Carbon::now();

        match ($period) {
            'today' => $query->whereBetween('created_at', [$now->copy()->startOfDay(), $now->copy()->endOfDay()]),
            'weekly' => $query->whereBetween('created_at', [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()]),
            'monthly' => $query->whereBetween('created_at', [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()]),
        };
    }

    private function applySearch($query, string $search, string $companyId): void
    {
        if ($search === '') {
            return;
        }

        $reportIds = Report::query()
            ->forCompany($companyId)
            ->where('title', 'like', "%{$search}%")
            ->pluck('id');

        $query->where(function ($searchQuery) use ($search, $reportIds) {
            $searchQuery
                ->where('description', 'like', "%{$search}%")
                ->orWhereHas('user', function ($userQuery) use ($search) {
                    $userQuery->where('name', 'like', "%{$search}%");
                })
                ->orWhereHas('project', function ($projectQuery) use ($search) {
                    $projectQuery->where('name', 'like', "%{$search}%");
                })
                ->orWhereHas('task', function ($taskQuery) use ($search) {
                    $taskQuery->where('title', 'like', "%{$search}%");
                })
                ->orWhere(function ($reportQuery) use ($reportIds, $search) {
                    $reportQuery->where('entity_type', 'Report')
                        ->where(function ($entityQuery) use ($reportIds, $search) {
                            $entityQuery->whereIn('entity_id', $reportIds)
                                ->orWhere('description', 'like', "%{$search}%");
                        });
                });
        });
    }
}
