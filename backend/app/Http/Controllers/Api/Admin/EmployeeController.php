<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateEmployeeRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\ActivityLogService;
use App\Services\NotificationService;
use App\Services\UserCreationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function __construct(protected UserCreationService $userCreationService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('manageEmployees');
        $companyId = auth()->user()->company_id;
        $employees = User::query()
            ->with([
                'company:id,name',
                'roles:id,name',
                'activeTasks' => fn ($query) => $query
                    ->whereHas('project', fn ($projectQuery) => $projectQuery->where('company_id', $companyId))
                    ->with('project:id,name')
                    ->orderByDesc('updated_at'),
            ])
            ->withCount([
                'tasks as total_assigned_tasks' => fn ($query) => $query->whereHas('project', fn ($projectQuery) => $projectQuery->where('company_id', $companyId)),
                'tasks as pending_tasks' => fn ($query) => $query->where('status', 'pending')->whereHas('project', fn ($projectQuery) => $projectQuery->where('company_id', $companyId)),
                'tasks as in_progress_tasks' => fn ($query) => $query->where('status', 'in_progress')->whereHas('project', fn ($projectQuery) => $projectQuery->where('company_id', $companyId)),
                'tasks as completed_tasks' => fn ($query) => $query->where('status', 'completed')->whereHas('project', fn ($projectQuery) => $projectQuery->where('company_id', $companyId)),
            ])
            ->where('company_id', $companyId)
            ->whereHas('roles', fn ($query) => $query->where('name', Role::EMPLOYEE))
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($employees),
            'meta' => [
                'current_page' => $employees->currentPage(),
                'last_page' => $employees->lastPage(),
                'per_page' => $employees->perPage(),
                'total' => $employees->total(),
            ],
        ]);
    }

    public function store(CreateEmployeeRequest $request): JsonResponse
    {
        $this->authorize('manageEmployees');
        $user = $this->userCreationService->createUser(
            $request->validated(),
            Role::EMPLOYEE,
            auth()->user()->company_id,
        );

        NotificationService::notifyCompanyAdminsExcept(
            auth()->user(),
            'Employee Joined',
            "{$user->name} joined the team",
            'employee_joined',
            'user',
            $user->id,
            [
                'employee_name' => $user->name,
                'employee_email' => $user->email,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Employee created successfully.',
            'data' => new UserResource($user),
        ], 201);
    }

    public function update(UpdateUserRequest $request, User $employee): JsonResponse
    {
        $this->authorize('manageEmployees');

        if ($employee->company_id !== auth()->user()->company_id || ! $employee->hasRole(Role::EMPLOYEE)) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found.',
            ], 404);
        }

        $data = $request->validated();
        $previousStatus = $employee->status;
        $data['avatar_url'] = $data['avatar_url'] ?? $data['avatar'] ?? $employee->avatar_url;
        unset($data['avatar']);

        $employee->fill($data);
        $employee->save();

        if ($previousStatus !== $employee->status) {
            if ($employee->status === 'active') {
                ActivityLogService::logUserActivated(auth()->user(), $employee);
            } elseif ($employee->status === 'inactive') {
                ActivityLogService::logUserDeactivated(auth()->user(), $employee);
            }
        }

        $this->loadPerformance($employee);

        return response()->json([
            'success' => true,
            'message' => 'Employee updated successfully.',
            'data' => new UserResource($employee),
        ]);
    }

    public function show(User $employee): JsonResponse
    {
        $this->authorize('manageEmployees');

        if ($employee->company_id !== auth()->user()->company_id || ! $employee->hasRole(Role::EMPLOYEE)) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found.',
            ], 404);
        }

        $this->loadPerformance($employee);

        return response()->json([
            'success' => true,
            'data' => new UserResource($employee),
        ]);
    }

    public function destroy(User $employee): JsonResponse
    {
        $this->authorize('manageEmployees');

        if ($employee->company_id !== auth()->user()->company_id || ! $employee->hasRole(Role::EMPLOYEE)) {
            return response()->json([
                'success' => false,
                'message' => 'Employee not found.',
            ], 404);
        }

        if ($employee->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete yourself.',
            ], 400);
        }

        $employee->delete();

        return response()->json([
            'success' => true,
            'message' => 'Employee deleted successfully.',
        ]);
    }

    private function loadPerformance(User $employee): void
    {
        $companyId = auth()->user()->company_id;

        $employee->load(['company:id,name', 'roles:id,name']);
        $employee->loadCount([
            'tasks as total_assigned_tasks' => fn ($query) => $query->whereHas('project', fn ($projectQuery) => $projectQuery->where('company_id', $companyId)),
            'tasks as pending_tasks' => fn ($query) => $query->where('status', 'pending')->whereHas('project', fn ($projectQuery) => $projectQuery->where('company_id', $companyId)),
            'tasks as in_progress_tasks' => fn ($query) => $query->where('status', 'in_progress')->whereHas('project', fn ($projectQuery) => $projectQuery->where('company_id', $companyId)),
            'tasks as completed_tasks' => fn ($query) => $query->where('status', 'completed')->whereHas('project', fn ($projectQuery) => $projectQuery->where('company_id', $companyId)),
        ]);
        $employee->load([
            'activeTasks' => fn ($query) => $query
                ->whereHas('project', fn ($projectQuery) => $projectQuery->where('company_id', $companyId))
                ->with('project:id,name')
                ->orderByDesc('updated_at'),
        ]);
    }
}
