<?php

namespace App\Http\Controllers\Api\Admin;

use App\Events\FileUploaded;
use App\Events\TaskAssigned;
use App\Events\TaskStatusChanged;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssignTaskRequest;
use App\Http\Requests\Admin\CreateTaskRequest;
use App\Http\Requests\Admin\UpdateTaskStatusRequest;
use App\Http\Requests\Admin\UploadTaskFileRequest;
use App\Http\Resources\TaskFileResource;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskFile;
use App\Models\User;
use App\Services\ActivityLogService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Task::class);
        $query = Task::with(['project', 'creator', 'users', 'files'])
            ->whereHas('project', fn ($query) => $query->where('company_id', auth()->user()->company_id));

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Apply date range filters if present
        $query->applyRequestRange($request, 'created_at');

        $tasks = $query->orderBy('created_at', 'desc')->paginate(15);

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

    public function store(CreateTaskRequest $request): JsonResponse
    {
        $this->authorize('create', Task::class);
        $project = Project::where('id', $request->project_id)
            ->where('company_id', auth()->user()->company_id)
            ->first();

        if (! $project) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found.',
            ], 404);
        }

        $task = Task::create(array_merge($request->validated(), [
            'created_by' => auth()->id(),
        ]));

        // Log task creation
        ActivityLogService::logTaskCreated(
            auth()->id(),
            $task->id,
            $task->toArray()
        );

        NotificationService::notifyCompanyAdminsExcept(
            auth()->user(),
            'Task Created',
            "Task \"{$task->title}\" was created",
            'task_created',
            'task',
            $task->id,
            [
                'task_title' => $task->title,
                'project_id' => $project->id,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Task created successfully.',
            'data' => new TaskResource($task->load(['project', 'creator', 'users', 'files'])),
        ], 201);
    }

    public function show(Task $task): JsonResponse
    {
        if (! $this->taskBelongsToCompany($task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found.',
            ], 404);
        }

        $this->authorize('view', $task);

        return response()->json([
            'success' => true,
            'data' => new TaskResource($task->load(['project', 'creator', 'users', 'files'])),
        ]);
    }

    public function assign(AssignTaskRequest $request, Task $task): JsonResponse
    {
        if (! $this->taskBelongsToCompany($task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found.',
            ], 404);
        }

        $this->authorize('assign', $task);

        $assignees = collect($request->validated('assignees', []))
            ->unique('id')
            ->values();

        $currentAssignees = $task->users()->pluck('users.id')->all();

        $syncData = $assignees->mapWithKeys(fn (array $assignee) => [
            $assignee['id'] => [
                'role' => $assignee['role'] ?? 'assignee',
            ],
        ])->all();

        $task->users()->sync($syncData);

        $removedAssigneeIds = array_values(array_diff($currentAssignees, array_keys($syncData)));

        foreach ($removedAssigneeIds as $removedAssigneeId) {
            $removedUser = User::find($removedAssigneeId);

            if (! $removedUser) {
                continue;
            }

            ActivityLogService::logTaskUnassigned(
                auth()->id(),
                $task->id,
                $removedUser->name
            );
        }

        // Log task assignment
        foreach ($assignees as $assignee) {
            $assigneeUser = User::find($assignee['id']);
            ActivityLogService::logTaskAssigned(
                auth()->id(),
                $task->id,
                $assignee['id'],
                $assigneeUser?->name ?? 'Unknown',
                $assignee['role'] ?? 'assignee'
            );

            // Dispatch notification event
            event(new TaskAssigned($task, $assigneeUser, auth()->user()));
        }

        $updatedTask = $task->load(['project', 'creator', 'users', 'files']);

        return response()->json([
            'success' => true,
            'message' => 'Task assignees updated successfully.',
            'data' => new TaskResource($updatedTask),
        ]);
    }

    public function updateStatus(UpdateTaskStatusRequest $request, Task $task): JsonResponse
    {
        if (! $this->taskBelongsToCompany($task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found.',
            ], 404);
        }

        $this->authorize('changeStatus', $task);

        $oldStatus = $task->status;
        $task->update(['status' => $request->status]);

        // Log status change
        ActivityLogService::logTaskStatusChanged(
            auth()->id(),
            $task->id,
            $oldStatus,
            $request->status
        );

        if ($request->status === 'completed') {
            ActivityLogService::logTaskCompleted(
                auth()->user(),
                $task,
                [
                    'old_status' => $oldStatus,
                    'new_status' => $request->status,
                ]
            );
        }

        // Dispatch notification event
        event(new TaskStatusChanged($task, $oldStatus, $request->status, auth()->user()));

        return response()->json([
            'success' => true,
            'message' => 'Task status updated successfully.',
            'data' => new TaskResource($task->load(['project', 'creator', 'users', 'files'])),
        ]);
    }

    public function uploadFile(UploadTaskFileRequest $request, Task $task): JsonResponse
    {
        if (! $this->taskBelongsToCompany($task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found.',
            ], 404);
        }

        $this->authorize('uploadFile', $task);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $folder = "tasks/{$task->id}";
        $disk = Storage::disk(config('filesystems.default'));

        $storageName = Str::uuid() . '_' . $originalName;
        $path = $disk->putFileAs($folder, $file, $storageName);

        $taskFile = TaskFile::create([
            'task_id' => $task->id,
            'uploaded_by' => auth()->id(),
            'file_name' => $originalName,
            'file_path' => $path,
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
        ]);

        // Log file upload
        ActivityLogService::logFileUploaded(
            auth()->id(),
            $task->id,
            $originalName,
            $file->getSize()
        );

        // Dispatch notification event
        event(new FileUploaded($taskFile, $task, auth()->user()));

        return response()->json([
            'success' => true,
            'message' => 'File uploaded successfully.',
            'data' => new TaskFileResource($taskFile),
        ], 201);
    }

    public function deleteFile(Task $task, TaskFile $taskFile): JsonResponse
    {
        if (! $this->taskBelongsToCompany($task) || $taskFile->task_id !== $task->id) {
            return response()->json([
                'success' => false,
                'message' => 'File not found.',
            ], 404);
        }

        $this->authorize('deleteFile', $task);

        $storedPath = $taskFile->file_path;
        if ($storedPath && ! Str::startsWith($storedPath, ['http://', 'https://'])) {
            Storage::disk(config('filesystems.default'))->delete($storedPath);
        }

        ActivityLogService::logFileDeleted(
            auth()->id(),
            $task->id,
            $taskFile->file_name
        );

        $taskFile->delete();

        return response()->json([
            'success' => true,
            'message' => 'File deleted successfully.',
        ]);
    }

    public function downloadFile(Task $task, TaskFile $taskFile)
    {
        if (! $this->taskBelongsToCompany($task) || $taskFile->task_id !== $task->id) {
            return response()->json([
                'success' => false,
                'message' => 'File not found.',
            ], 404);
        }

        $this->authorize('view', $task);

        return Storage::disk(config('filesystems.default'))->download(
            $taskFile->file_path,
            $taskFile->file_name
        );
    }

    protected function taskBelongsToCompany(Task $task): bool
    {
        return $task->project && $task->project->company_id === auth()->user()->company_id;
    }
}
