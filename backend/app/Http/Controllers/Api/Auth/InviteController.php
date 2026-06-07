<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\AcceptInviteRequest;
use App\Models\Invite;
use App\Models\User;
use App\Services\ActivityLogService;
use App\Services\InviteService;
use App\Services\NotificationService;
use App\Services\UserCreationService;
use App\Services\RefreshTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class InviteController extends Controller
{
    public function __construct(
        protected InviteService $inviteService,
        protected UserCreationService $userCreationService,
        protected RefreshTokenService $refreshTokenService
    ) {
    }

    public function accept(AcceptInviteRequest $request): JsonResponse
    {
        $data = $request->validated();
        $publicId = $data['invite_id'];

        $invite = null;
        $user = null;

        DB::transaction(function () use (&$invite, &$user, $publicId, $data) {
            $invite = Invite::query()
                ->where('public_id', $publicId)
                ->lockForUpdate()
                ->first();

            if (! $invite) {
                abort(response()->json(['success' => false, 'message' => 'Invalid invite.'], 404));
            }

            if ($invite->isHiddenInvite()) {
                abort(response()->json(['success' => false, 'message' => 'This invite is archived.'], 404));
            }

            if ($invite->isRevoked()) {
                abort(response()->json(['success' => false, 'message' => 'This invite has been revoked.'], 410));
            }

            if ($invite->isAccepted()) {
                abort(response()->json([
                    'success' => false,
                    'message' => 'This invite has already been used.',
                ], 409));
            }

            if ($invite->isExpired()) {
                abort(response()->json(['success' => false, 'message' => 'This invite has expired.'], 410));
            }

            if (! in_array($invite->role, ['employee', 'client'], true)) {
                abort(response()->json([
                    'success' => false,
                    'message' => 'Invalid invite role.',
                ], 422));
            }

            if (User::query()->where('email', $invite->email)->exists()) {
                abort(response()->json([
                    'success' => false,
                    'message' => 'This email is already registered.',
                ], 422));
            }

            // Create user in invite's company with role from invite
            $user = $this->userCreationService->createUser([
                'name' => trim("{$data['first_name']} {$data['last_name']}"),
                'email' => $invite->email,
                'password' => $data['password'],
            ], $invite->role, $invite->company_id);

            // mark invite used atomically under the same row lock
            $invite->markUsed($user->id);
        });

        ActivityLogService::logInviteAccepted($user, $invite);

        if ($invite->creator) {
            NotificationService::notifyUser(
                $invite->creator,
                'Invite Accepted',
                "Invite accepted by {$user->name}",
                'invite_accepted',
                'invite',
                $invite->id,
                [
                    'invite_email' => $invite->email,
                    'accepted_by' => $user->name,
                ]
            );
        }

        // issue tokens
        $token = auth('api')->login($user);
        $user->forceFill(['last_login_at' => now()])->save();
        $refresh = $this->refreshTokenService->createForUser($user, $request->userAgent() ?? null, $request->ip());

        return response()->json([
            'success' => true,
            'message' => 'Invite accepted.',
            'data' => [
                'token' => $token,
                'refresh_token' => $refresh['plain'],
                'refresh_expires_at' => optional($refresh['model']->expires_at)->getTimestamp(),
                'user' => $user->fresh()->load('roles', 'company'),
            ],
        ], 201);
    }

    public function validateInvite(string $publicId): JsonResponse
    {
        $invite = Invite::query()->where('public_id', $publicId)->first();

        if (! $invite || $invite->isHiddenInvite() || $invite->isRevoked() || $invite->isAccepted() || $invite->isExpired()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired invite.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'invite_id' => $invite->public_id,
                'email' => $invite->email,
                'role' => $invite->role,
                'expires_at' => optional($invite->expires_at)->toDateTimeString(),
                'status' => $invite->status,
            ],
        ]);
    }
}
