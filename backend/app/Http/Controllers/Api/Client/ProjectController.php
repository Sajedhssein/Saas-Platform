<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $user = auth('api')->user();
        $this->authorize('viewAny', Project::class);

        $projects = Project::with(['client:id,name', 'creator:id,name', 'tasks' => function ($q) {
            $q->select('id', 'project_id', 'title', 'status', 'progress');
        }])
            ->where('company_id', $user->company_id)
            ->where(function ($query) use ($user) {
                $query->where('client_id', $user->id)
                    ->orWhereHas('users', fn ($pivotQuery) => $pivotQuery->whereKey($user->id));
            })
            ->paginate(20);

        return response()->json([
            'data' => $projects->items(),
            'pagination' => [
                'total' => $projects->total(),
                'per_page' => $projects->perPage(),
                'current_page' => $projects->currentPage(),
                'last_page' => $projects->lastPage(),
            ],
        ], 200);
    }

    public function show(Project $project): JsonResponse
    {
        $user = auth('api')->user();

        if ($project->company_id !== $user->company_id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $this->authorize('view', $project);

        $project->load(['client:id,name', 'creator:id,name', 'tasks' => function ($q) {
            $q->select('id', 'project_id', 'title', 'description', 'status', 'progress', 'deadline')
              ->with(['files' => function ($q2) {
                  $q2->select('id', 'task_id', 'file_name', 'file_path', 'uploaded_by');
              }]);
        }]);

        return response()->json(['data' => $project], 200);
    }
}
