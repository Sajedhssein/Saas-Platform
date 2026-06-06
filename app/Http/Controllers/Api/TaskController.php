<?php

namespace App\Http\Controllers\Api;

//use App\Events\FileUploaded;
use App\Events\ResponseSubmitted;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SubmitTaskResponseRequest;
use App\Http\Resources\TaskFileResource;
use App\Http\Resources\TaskResource;
use App\Http\Resources\TaskResponseResource;
use App\Models\Task;
use App\Models\TaskFile;
use App\Models\TaskResponse;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class TaskController extends Controller
{
    public function assigned(Request $request): JsonResponse
    {
        $tasks = Task::with(['project', 'creator', 'users', 'files'])
            ->whereHas('users', fn ($query) => $query->where('users.id', auth()->id()))
            ->orderBy('created_at', 'desc')
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

    public function show(Task $task): JsonResponse
    {
        $task->loadMissing('project');

        if (! $task->project || $task->project->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or not assigned to you.',
            ], 404);
        }

        $this->authorize('view', $task);

        if (! $this->canAccessTask($task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or not assigned to you.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new TaskResource($task->load(['project', 'creator', 'users', 'files'])),
        ]);
    }

    public function showFile(Task $task, TaskFile $taskFile): Response|JsonResponse
    {
        $task->loadMissing('project');

        if (! $task->project || $task->project->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'File not found or task not assigned to you.',
            ], 404);
        }

        $this->authorize('view', $task);

        if (! $this->canAccessTask($task) || $taskFile->task_id !== $task->id) {
            return response()->json([
                'success' => false,
                'message' => 'File not found or task not assigned to you.',
            ], 404);
        }

        if (! request()->expectsJson() && ! request()->wantsJson()) {
            return Storage::disk(config('filesystems.default'))->download(
                $taskFile->file_path,
                $taskFile->file_name
            );
        }

        return response()->json([
            'success' => true,
            'data' => new TaskFileResource($taskFile),
        ]);
    }

    public function responses(Task $task): JsonResponse
    {
        $task->loadMissing('project');

        if (! $task->project || $task->project->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or not assigned to you.',
            ], 404);
        }

        $this->authorize('view', $task);

        if (! $this->canAccessTask($task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or not assigned to you.',
            ], 404);
        }

        $responses = TaskResponse::where('task_id', $task->id)
            ->where('user_id', auth()->id())
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => TaskResponseResource::collection($responses),
        ]);
    }

    public function submitResponse(SubmitTaskResponseRequest $request, Task $task): JsonResponse
    {
        $task->loadMissing('project');

        if (! $task->project || $task->project->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or not assigned to you.',
            ], 404);
        }

        $this->authorize('respond', $task);

        if (! $this->canAccessTask($task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or not assigned to you.',
            ], 404);
        }

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachment = $request->file('attachment');
            $storageName = Str::uuid() . '_' . $attachment->getClientOriginalName();
            $attachmentPath = Storage::disk(config('filesystems.default'))->putFileAs(
                "tasks/{$task->id}/responses",
                $attachment,
                $storageName
            );
        }

        $taskResponse = TaskResponse::create([
            'task_id' => $task->id,
            'user_id' => auth()->id(),
            'response' => $request->response,
            'attachment_url' => $attachmentPath,
            'status' => 'submitted',
        ]);

        // Log response submission
        ActivityLogService::logResponseSubmitted(
            auth()->id(),
            $task->id,
            auth()->user()->name
        );

        // Dispatch notification event
        event(new ResponseSubmitted($taskResponse, $task, auth()->user()));

        return response()->json([
            'success' => true,
            'message' => 'Response submitted successfully.',
            'data' => new TaskResponseResource($taskResponse),
        ], 201);
    }

    protected function userAssignedToTask(Task $task): bool
    {
        return $task->users()->where('users.id', auth()->id())->exists();
    }

    protected function canAccessTask(Task $task): bool
    {
        $user = auth()->user();

        if ($user->hasRole('admin')) {
            return $task->project?->company_id === $user->company_id;
        }

        if ($user->hasRole('employee')) {
            return $this->userAssignedToTask($task);
        }

        return $this->userAssignedToTask($task)
            || ($task->project && $task->project->users()->whereKey($user->id)->exists());
    }
}
