<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateGeneralSettingsRequest;
use App\Http\Requests\Settings\UpdateNotificationPreferencesRequest;
use App\Http\Requests\Settings\UpdateSecuritySettingsRequest;
use App\Models\Company;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Services\RefreshTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class SettingsController extends Controller
{
    public function __construct(private readonly RefreshTokenService $refreshTokenService)
    {
    }

    public function general(): JsonResponse
    {
        $company = $this->currentCompany();

        return response()->json([
            'success' => true,
            'data' => [
                'name' => $company->name,
                'email' => $company->email,
                'phone' => $company->phone,
            ],
        ]);
    }

    public function updateGeneral(UpdateGeneralSettingsRequest $request): JsonResponse
    {
        $company = $this->currentCompany();
        $company->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'General settings updated successfully.',
            'data' => [
                'name' => $company->name,
                'email' => $company->email,
                'phone' => $company->phone,
            ],
        ]);
    }

    public function security(UpdateSecuritySettingsRequest $request): JsonResponse
    {
        $user = auth()->user();

        if (! Hash::check($request->validated()['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->forceFill([
            'password' => $request->validated()['new_password'],
            'token_invalidated_at' => now(),
        ])->save();

        $this->refreshTokenService->revokeAllForUser($user);

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully.',
        ]);
    }

    public function team(): JsonResponse
    {
        $companyId = auth()->user()->company_id;

        $members = User::query()
            ->with(['roles:id,name'])
            ->where('company_id', $companyId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (User $member) => [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'role' => $member->roles->first()?->name,
                'status' => $member->status,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => $members,
            'total_members' => User::where('company_id', $companyId)->count(),
        ]);
    }

    public function notifications(): JsonResponse
    {
        $preferences = $this->resolvePreferences(auth()->user());

        return response()->json([
            'success' => true,
            'data' => $preferences,
        ]);
    }

    public function updateNotifications(UpdateNotificationPreferencesRequest $request): JsonResponse
    {
        $user = auth()->user();

        $preferences = NotificationPreference::query()->updateOrCreate(
            ['user_id' => $user->id],
            $request->validated()
        );

        return response()->json([
            'success' => true,
            'message' => 'Notification preferences updated successfully.',
            'data' => $this->preferencesPayload($preferences),
        ]);
    }

    private function currentCompany(): Company
    {
        return Company::query()->findOrFail(auth()->user()->company_id);
    }

    private function resolvePreferences(User $user): array
    {
        $preferences = $user->notificationPreference()->first();

        return $this->preferencesPayload($preferences);
    }

    private function preferencesPayload(?NotificationPreference $preferences): array
    {
        $defaults = NotificationPreference::defaults();

        return array_merge($defaults, $preferences ? $preferences->only(array_keys($defaults)) : []);
    }
}
