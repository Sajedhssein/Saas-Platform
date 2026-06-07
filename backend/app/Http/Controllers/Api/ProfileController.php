<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(new UserResource(auth()->user()));
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = auth()->user();
        $user->update($request->validated());

        return response()->json(new UserResource($user->fresh()));
    }

    public function updateAvatar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $user = auth()->user();

        if ($user->avatar_url) {
            $path = parse_url($user->avatar_url, PHP_URL_PATH);
            $storagePrefix = '/storage/';

            if (is_string($path) && str_starts_with($path, $storagePrefix)) {
                Storage::disk('public')->delete(substr($path, strlen($storagePrefix)));
            }
        }

        $path = $validated['avatar']->store('avatars', 'public');
        $user->update([
            'avatar_url' => Storage::disk('public')->url($path),
        ]);

        return response()->json(new UserResource($user->fresh()));
    }

    public function dismissWelcome(): JsonResponse
    {
        $user = auth()->user();

        if ($user->first_login_at === null) {
            $user->forceFill(['first_login_at' => now()])->save();
        }

        return response()->json(new UserResource($user->fresh()));
    }
}
