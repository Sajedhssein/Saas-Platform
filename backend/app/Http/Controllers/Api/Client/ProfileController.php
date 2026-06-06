<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\UpdateClientPasswordRequest;
use App\Http\Requests\Client\UpdateClientProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    /**
     * Get authenticated client's profile
     */
    public function show(): JsonResponse
    {
        $user = auth('api')->user();

        return response()->json($this->profilePayload($user), 200);
    }

    /**
     * Update authenticated client's profile
     */
    public function update(UpdateClientProfileRequest $request): JsonResponse
    {
        $user = auth('api')->user();

        $user->update($request->validated());

        return response()->json($this->profilePayload($user->fresh()), 200);
    }

    /**
     * Update authenticated client's password
     */
    public function updatePassword(UpdateClientPasswordRequest $request): JsonResponse
    {
        $user = auth('api')->user();

        $user->update([
            'password' => Hash::make($request->validated()['new_password']),
        ]);

        return response()->json([
            'message' => 'Password updated successfully.',
        ], 200);
    }

    /**
     * Format profile response payload
     */
    private function profilePayload($user): array
    {
        return [
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'position' => $user->position,
            'company' => $user->company ? [
                'id' => $user->company->id,
                'name' => $user->company->name,
            ] : null,
        ];
    }
}
