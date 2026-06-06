<?php

namespace App\Http\Controllers\Api\Employee;

use App\Http\Controllers\Controller;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
}
