<?php

namespace App\Http\Controllers\Api;

use App\Events\CommentAdded;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskCommentRequest;
use App\Http\Requests\UpdateTaskCommentRequest;
use App\Http\Resources\TaskCommentResource;
use App\Models\Task;
use App\Models\TaskComment;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class CommentController extends Controller
{
    /**
     * Store a comment on a task
     */
    public function store(Task $task, StoreTaskCommentRequest $request): JsonResponse
    {
        $user = auth()->user();

        $task->load('project', 'users');
        if (! $task->project || $task->project->company_id !== $user->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found.',
            ], 404);
        }

        $this->authorize('comment', $task);

        $comment = $task->comments()->create([
            'user_id' => $user->id,
            'comment' => $request->input('content'),
        ]);

        // Log comment creation
        ActivityLogService::logCommentCreated(
            auth()->id(),
            $task->id,
            auth()->user()->name,
            substr($request->input('content'), 0, 100)
        );

        // Dispatch notification event
        event(new CommentAdded($comment, $task, auth()->user()));

        return response()->json([
            'message' => 'Comment added successfully',
            'data' => new TaskCommentResource($comment),
        ], Response::HTTP_CREATED);
    }

    /**
     * Get all comments for a task with pagination
     */
    public function index(Task $task): JsonResponse
    {
        $user = auth()->user();

        $task->load('project', 'users');
        if (! $task->project || $task->project->company_id !== $user->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found.',
            ], 404);
        }

        $this->authorize('comment', $task);

        $perPage = 15;
        $sortBy = request()->query('sort', 'newest'); // newest or oldest

        $query = $task->comments()->with('user');

        // Apply sorting
        if ($sortBy === 'oldest') {
            $query->orderBy('created_at', 'asc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $comments = $query->paginate($perPage);

        return response()->json([
            'data' => TaskCommentResource::collection($comments->items()),
            'pagination' => [
                'total' => $comments->total(),
                'per_page' => $comments->perPage(),
                'current_page' => $comments->currentPage(),
                'last_page' => $comments->lastPage(),
                'from' => $comments->firstItem(),
                'to' => $comments->lastItem(),
                'has_more' => $comments->hasMorePages(),
            ],
        ]);
    }

    /**
     * Update a comment
     */
    public function update(TaskComment $comment, UpdateTaskCommentRequest $request): JsonResponse
    {
        $this->authorize('update', $comment);

        $comment->update([
            'comment' => $request->input('content'),
        ]);

        // Log comment update
        ActivityLogService::logCommentUpdated(
            auth()->id(),
            $comment->task_id,
            auth()->user()->name
        );

        return response()->json([
            'message' => 'Comment updated successfully',
            'data' => new TaskCommentResource($comment),
        ]);
    }

    /**
     * Delete a comment (soft delete)
     */
    public function destroy(TaskComment $comment): JsonResponse
    {
        $this->authorize('delete', $comment);

        $taskId = $comment->task_id;

        $comment->delete();

        // Log comment deletion
        ActivityLogService::logCommentDeleted(
            auth()->id(),
            $taskId,
            auth()->user()->name
        );

        return response()->json([
            'message' => 'Comment deleted successfully',
        ], Response::HTTP_NO_CONTENT);
    }
}
