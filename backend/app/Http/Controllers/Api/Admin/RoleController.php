<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateRoleRequest;
use App\Models\Role;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => Role::orderBy('name')->get(),
        ]);
    }

    public function store(CreateRoleRequest $request): JsonResponse
    {
        $role = Role::firstOrCreateByName($request->validated()['name']);

        return response()->json([
            'success' => true,
            'message' => 'Role created successfully.',
            'data' => $role,
        ], 201);
    }

    public function destroy(Role $role): JsonResponse
    {
        if (strtolower($role->name) === Role::SUPER_ADMIN) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete reserved role.',
            ], 403);
        }

        $role->delete();

        return response()->json([
            'success' => true,
            'message' => 'Role deleted successfully.',
        ]);
    }
}
