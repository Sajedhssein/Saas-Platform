<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): mixed
    {
        $user = auth('api')->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Block inactive users
        if ($user->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Account inactive.',
            ], Response::HTTP_FORBIDDEN);
        }

        // Optional: enforce token invalidation if the user has a token_invalidated_at timestamp
        try {
            $payload = auth('api')->payload();
            $iat = $payload->get('iat') ?? null;

            if ($iat && property_exists($user, 'token_invalidated_at') && $user->token_invalidated_at) {
                // token_invalidated_at may be a Carbon instance or datetime string
                $invalidatedAt = $user->token_invalidated_at instanceof \DateTimeInterface
                    ? $user->token_invalidated_at->getTimestamp()
                    : (is_string($user->token_invalidated_at) ? strtotime($user->token_invalidated_at) : null);

                if ($invalidatedAt && $iat <= $invalidatedAt) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Token revoked.',
                    ], Response::HTTP_FORBIDDEN);
                }
            }
        } catch (\Throwable $e) {
            // If payload can't be read, fail closed by allowing request to continue only if user active.
        }

        return $next($request);
    }
}
