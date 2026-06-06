<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateProjectRequest;
use App\Http\Requests\Admin\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Services\ActivityLogService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    private function projectMetrics(): array
    {
        return [
            'tasks',
            'tasks as completed_tasks' => fn ($query) => $query->where('status', 'completed'),
        ];
    }

    private function applyProjectMetrics($query)
    {
        return $query
            ->with(['creator', 'client:id,name', 'employees:id,name,email'])
            ->withCount($this->projectMetrics())
            ->withAvg('tasks', 'progress');
    }

    private function loadProjectMetrics(Project $project): Project
    {
        return $project
            ->load(['creator', 'client:id,name', 'employees:id,name,email'])
            ->loadCount($this->projectMetrics())
            ->loadAvg('tasks', 'progress');
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Project::class);
        $query = $this->applyProjectMetrics(
            Project::where('company_id', auth()->user()->company_id)
        );

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%'.$request->search.'%')
                    ->orWhere('description', 'like', '%'.$request->search.'%');
            });
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        // Apply optional date filters (created_at)
        $query->applyRequestRange($request, 'created_at');

        $projects = $query->orderBy('created_at', 'desc')->paginate(15);

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

    public function store(CreateProjectRequest $request): JsonResponse
    {
        $this->authorize('create', Project::class);
        $data = $request->validated();
        $employeeIds = isset($data['employee_ids'])
            ? array_values(array_unique($data['employee_ids']))
            : [];
        unset($data['employee_ids']);

        $project = Project::create(array_merge($data, [
            'company_id' => auth()->user()->company_id,
            'created_by' => auth()->id(),
        ]));

        if ($employeeIds !== []) {
            $project->employees()->syncWithoutDetaching($employeeIds);
        }

        ActivityLogService::logProjectCreated(auth()->user(), $project);
        NotificationService::notifyUser(
            auth()->user(),
            'Project Created',
            "Project {$project->name} was created",
            'project',
            'project',
            $project->id,
            ['project_name' => $project->name]
        );

        return response()->json([
            'success' => true,
            'message' => 'Project created successfully.',
            'data' => new ProjectResource($this->loadProjectMetrics($project)),
        ], 201);
    }

    public function show(Project $project): JsonResponse
    {
        if ($project->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found.',
            ], 404);
        }

        $this->authorize('view', $project);

        return response()->json([
            'success' => true,
            'data' => new ProjectResource($this->loadProjectMetrics($project)),
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        if ($project->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found.',
            ], 404);
        }

        $this->authorize('update', $project);

        $previousStatus = $project->status;
        $data = $request->validated();
        $employeeIds = array_key_exists('employee_ids', $data)
            ? array_values(array_unique($data['employee_ids']))
            : null;

        unset($data['employee_ids']);

        $project->update($data);

        if ($employeeIds !== null) {
            $project->employees()->sync($employeeIds);
        }

        if ($previousStatus !== 'completed' && $project->status === 'completed') {
            ActivityLogService::logProjectCompleted(auth()->user(), $project);
            NotificationService::notifyUser(
                auth()->user(),
                'Project Completed',
                "Project {$project->name} was completed",
                'project',
                'project',
                $project->id,
                ['project_name' => $project->name]
            );
        }

        $project->loadMissing('client');

        if ($project->client) {
            NotificationService::notifyUser(
                $project->client,
                'Project Updated',
                "Project {$project->name} was updated",
                'project_updated',
                'project',
                $project->id,
                ['project_name' => $project->name]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Project updated successfully.',
            'data' => new ProjectResource($this->loadProjectMetrics($project)),
        ]);
    }

    public function destroy(Project $project): JsonResponse
    {
        if ($project->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found.',
            ], 404);
        }

        $this->authorize('delete', $project);

        $project->delete();

        return response()->json([
            'success' => true,
            'message' => 'Project deleted successfully.',
        ]);
    }
}
