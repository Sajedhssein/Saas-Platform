<?php

namespace App\Http\Controllers\Api\Employee;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
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

        $projects = Project::query()
            ->with(['client:id,name', 'creator:id,name,email', 'employees:id,name,email'])
            ->withCount([
                'tasks',
                'tasks as completed_tasks' => fn ($query) => $query->where('status', 'completed'),
            ])
            ->withAvg('tasks', 'progress')
            ->where('company_id', $user->company_id)
            ->whereHas('employees', fn ($query) => $query->whereKey($user->id))
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => ProjectResource::collection($projects),
            'meta' => [
                'current_page' => $projects->currentPage(),
                'last_page' => $projects->lastPage(),
                'per_page' => $projects->perPage(),
                'total' => $projects->total(),
            ],
        ]);
    }
}
