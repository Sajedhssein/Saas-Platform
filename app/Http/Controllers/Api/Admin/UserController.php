<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssignRolesRequest;
use App\Http\Requests\Admin\CreateUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\UserCreationService;
use App\Services\RefreshTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(protected UserCreationService $userCreationService, protected RefreshTokenService $refreshTokenService)
    {
    }
    public function index(Request $request): JsonResponse
    {
        $query = User::inSameCompany(auth()->user())
            ->with('roles');

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by role
        if ($request->has('role')) {
            $role = Role::getByName($request->role);
            if ($role) {
                $query->whereHas('roles', function ($q) use ($role) {
                    $q->where('roles.id', $role->id);
                });
            }
        }

        $users = $query->paginate(15);

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($users),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(CreateUserRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = $this->userCreationService->createUser(
            [
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'phone' => $data['phone'] ?? null,
            ],
            $data['role'],
            auth()->user()->company_id,
        );

        return response()->json([
            'success' => true,
            'message' => 'User created successfully.',
            'data' => new UserResource($user->load('roles')),
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        // Ensure user is in same company
        if ($user->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new UserResource($user->load('roles')),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        if ($user->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        $user->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully.',
            'data' => new UserResource($user->load('roles')),
        ]);
    }

    public function updateRoles(AssignRolesRequest $request, User $user): JsonResponse
    {
        // Ensure user is in same company
        if ($user->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        // Prevent admin from assigning super_admin
        $requestedRoles = collect($request->roles)->map(fn ($role) => strtolower($role));
        if ($requestedRoles->contains('super_admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot assign super_admin role.',
            ], 403);
        }

        // Get role IDs
        $roleIds = [];
        foreach ($request->roles as $roleName) {
            $role = Role::getByName($roleName);
            if ($role) {
                $roleIds[] = $role->id;
            }
        }

        $user->roles()->sync($roleIds);

        return response()->json([
            'success' => true,
            'message' => 'User roles updated successfully.',
            'data' => new UserResource($user->load('roles')),
        ]);
    }

    public function deactivate(User $user): JsonResponse
    {
        // Ensure user is in same company
        if ($user->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        // Prevent deactivating self
        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot deactivate yourself.',
            ], 400);
        }

        $user->update([
            'status' => 'inactive',
            'token_invalidated_at' => now(),
        ]);

        // Revoke all refresh tokens for the user
        $this->refreshTokenService->revokeAllForUser($user);

        return response()->json([
            'success' => true,
            'message' => 'User deactivated successfully.',
        ]);
    }

    public function activate(User $user): JsonResponse
    {
        // Ensure user is in same company
        if ($user->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        $user->update(['status' => 'active']);

        return response()->json([
            'success' => true,
            'message' => 'User activated successfully.',
            'data' => new UserResource($user->load('roles')),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        // Ensure user is in same company
        if ($user->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        // Prevent deleting self
        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete yourself.',
            ], 400);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully.',
        ]);
    }
}
