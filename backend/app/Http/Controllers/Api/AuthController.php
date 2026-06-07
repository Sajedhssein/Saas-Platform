<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterCompanyAdminRequest;
use App\Http\Requests\Auth\UpdateMeRequest;
use App\Http\Resources\UserResource;
use App\Models\Company;
use App\Models\User;
use App\Services\UserCreationService;
use App\Services\RefreshTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(protected UserCreationService $userCreationService, protected RefreshTokenService $refreshTokenService)
    {
    }

    public function register(RegisterCompanyAdminRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            $company = Company::create([
                'name' => $data['company_name'],
                'slug' => Str::slug($data['company_name']),
            ]);

            return $this->userCreationService->createUser([
                'name' => trim("{$data['first_name']} {$data['last_name']}"),
                'email' => $data['email'],
                'password' => $data['password'],
            ], 'admin', $company->id);
        });

        $token = auth('api')->login($user);
        $user->forceFill(['last_login_at' => now()])->save();

        // create refresh token
        $refresh = $this->refreshTokenService->createForUser($user, $request->userAgent() ?? null, $request->ip());

        return response()->json([
            'success' => true,
            'message' => 'Company and admin user registered successfully.',
            'data' => [
                'token' => $token,
                'token_type' => 'bearer',
                'expires_in' => auth('api')->factory()->getTTL() * 60,
                'refresh_token' => $refresh['plain'],
                'refresh_expires_in' => optional($refresh['model']->expires_at)->getTimestamp(),
                'user' => UserResource::make($user),
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only(['email', 'password']);

        if (!$token = auth('api')->attempt($credentials)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
            ], 401);
        }

        $user = auth('api')->user();
        $user->forceFill(['last_login_at' => now()])->save();
        $refresh = $this->refreshTokenService->createForUser($user, $request->userAgent() ?? null, $request->ip());

        return $this->respondWithToken($token, UserResource::make($user), $refresh['plain'], optional($refresh['model']->expires_at)->getTimestamp());
    }

    public function logout(Request $request): JsonResponse
    {
        // revoke current jwt
        try {
            auth('api')->logout();
        } catch (\Throwable $e) {
            // ignore
        }

        // revoke provided refresh token or all for user
        $refreshToken = $request->input('refresh_token');
        if ($refreshToken) {
            $model = $this->refreshTokenService->findByPlain($refreshToken);
            if ($model) {
                $this->refreshTokenService->revoke($model);
            }
        } elseif (auth('api')->user()) {
            $this->refreshTokenService->revokeAllForUser(auth('api')->user());
        }

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new UserResource(auth('api')->user()),
        ]);
    }

    public function updateMe(UpdateMeRequest $request): JsonResponse
    {
        $user = auth('api')->user();
        $user->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => new UserResource($user->fresh()),
        ]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $plain = $request->input('refresh_token');
        if (! $plain) {
            // fallback to legacy JWT refresh
            try {
                $token = auth('api')->refresh();
                return $this->respondWithToken($token, UserResource::make(auth('api')->user()));
            } catch (\Throwable $e) {
                return response()->json(['success' => false, 'message' => 'Refresh token is required.'], 401);
            }
        }

        $model = $this->refreshTokenService->findByPlain($plain);
        if (! $model || $model->revoked) {
            return response()->json(['success' => false, 'message' => 'Invalid refresh token.'], 401);
        }

        if ($model->expires_at && $model->expires_at->isPast()) {
            return response()->json(['success' => false, 'message' => 'Refresh token expired.'], 401);
        }

        $user = $model->user;
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Invalid refresh token.'], 401);
        }

        // Single-use: revoke old token and issue a new one
        $this->refreshTokenService->revoke($model);

        $token = auth('api')->login($user);
        $user->forceFill(['last_login_at' => now()])->save();
        $refresh = $this->refreshTokenService->createForUser($user, $request->userAgent() ?? null, $request->ip());

        return $this->respondWithToken($token, UserResource::make($user), $refresh['plain'], optional($refresh['model']->expires_at)->getTimestamp());
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        Password::broker()->sendResetLink($request->only('email'));

        return response()->json([
            'success' => true,
            'message' => 'If an account exists, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => $password,
                    'token_invalidated_at' => now(),
                ])->save();

                $this->refreshTokenService->revokeAllForUser($user);
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'success' => false,
                'message' => match ($status) {
                    Password::INVALID_TOKEN => 'Invalid token.',
                    Password::INVALID_USER => 'Invalid email.',
                    default => 'Password reset failed.',
                },
            ], match ($status) {
                Password::INVALID_TOKEN => 400,
                Password::INVALID_USER => 404,
                default => 400,
            });
        }

        return response()->json([
            'success' => true,
            'message' => 'Password reset successful.',
        ]);
    }

    protected function respondWithToken(string $token, UserResource $user, ?string $refreshPlain = null, $refreshExpiresAt = null): JsonResponse
    {
        $data = [
            'token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
            'user' => $user,
        ];

        if ($refreshPlain) {
            $data['refresh_token'] = $refreshPlain;
            $data['refresh_expires_at'] = $refreshExpiresAt;
        }

        return response()->json([
            'success' => true,
            'message' => 'Authentication successful.',
            'data' => $data,
        ]);
    }
}
