<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateEmployeeRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
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
        $employees = User::query()
            ->with(['company:id,name', 'roles:id,name'])
            ->where('company_id', auth()->user()->company_id)
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

        $employee->fill($request->validated());
        $employee->save();

        $employee->load(['company:id,name', 'roles:id,name']);

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

        $employee->load(['company:id,name', 'roles:id,name']);

        return response()->json([
            'success' => true,
            'data' => new UserResource($employee),
        ]);
    }
}
