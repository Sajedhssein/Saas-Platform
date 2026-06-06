<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateClientRequest;
use App\Http\Requests\Admin\UpdateClientRequest;
use App\Http\Resources\UserResource;
use App\Models\Client;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use App\Services\UserCreationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function __construct(protected UserCreationService $userCreationService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('manageClients');
        $clients = Client::query()
            ->with(['company:id,name', 'roles:id,name'])
            ->where('company_id', auth()->user()->company_id)
            ->whereHas('roles', fn ($query) => $query->where('name', Role::CLIENT))
            ->withCount('projects')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($clients),
            'meta' => [
                'current_page' => $clients->currentPage(),
                'last_page' => $clients->lastPage(),
                'per_page' => $clients->perPage(),
                'total' => $clients->total(),
            ],
        ]);
    }

    public function store(CreateClientRequest $request): JsonResponse
    {
        $this->authorize('manageClients');
        $user = $this->userCreationService->createUser(
            $request->validated(),
            Role::CLIENT,
            auth()->user()->company_id,
        );

        $client = Client::query()
            ->with(['company:id,name', 'roles:id,name'])
            ->withCount('projects')
            ->findOrFail($user->id);

        return response()->json([
            'success' => true,
            'message' => 'Client created successfully.',
            'data' => new UserResource($client),
        ], 201);
    }

    public function update(UpdateClientRequest $request, Client $client): JsonResponse
    {
        $this->authorize('manageClients');

        if ($client->company_id !== auth()->user()->company_id || ! $client->hasRole(Role::CLIENT)) {
            return response()->json([
                'success' => false,
                'message' => 'Client not found.',
            ], 404);
        }

        $client->fill($request->validated());
        $client->save();

        $client = Client::query()
            ->with(['company:id,name', 'roles:id,name'])
            ->withCount('projects')
            ->findOrFail($client->id);

        return response()->json([
            'success' => true,
            'message' => 'Client updated successfully.',
            'data' => new UserResource($client),
        ]);
    }

    public function show(User $client): JsonResponse
    {
        $this->authorize('manageClients');

        if ($client->company_id !== auth()->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'Client not found.',
            ], 404);
        }

        if (! $client->hasRole(Role::CLIENT)) {
            return response()->json([
                'success' => false,
                'message' => 'Client not found.',
            ], 404);
        }

        $client = Client::query()
            ->with(['company:id,name', 'roles:id,name', 'projects' => function ($query) {
                $query->select('id', 'client_id', 'name', 'progress', 'status', 'created_at')
                    ->orderByDesc('created_at')
                    ->orderByDesc('id')
                    ->limit(5);
            }])
            ->withCount('projects')
            ->findOrFail($client->id);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'phone' => $client->phone,
                'department' => $client->department,
                'position' => $client->position,
                'status' => $client->status,
                'role' => $client->roles->pluck('name')->first(),
                'created_at' => $client->created_at?->toDateTimeString(),
                'projects_count' => (int) $client->projects_count,
                'latest_projects' => $client->projects->map(fn (Project $project) => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'progress' => (int) $project->progress,
                    'status' => $project->status,
                ])->values(),
            ],
        ]);
    }
}
