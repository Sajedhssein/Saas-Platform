<?php

namespace App\Http\Middleware;

use Closure;
// use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $roles): mixed
    {
        $user = auth('api')->user() ?? auth()->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $allowedRoles = collect(explode(',', $roles))
            ->map(fn ($role) => strtolower(trim($role)))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($user->hasAnyRole($allowedRoles)) {
            return $next($request);
        }

        // Log forbidden access for debugging
        try {
            \Illuminate\Support\Facades\Log::warning('RoleMiddleware forbidden', [
                'user_id' => $user->id ?? null,
                'allowed_roles' => $allowedRoles,
                'user_roles' => $user->roles->pluck('name')->toArray() ?? [],
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('RoleMiddleware logging failed', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Forbidden.',
        ], Response::HTTP_FORBIDDEN);
    }
}
