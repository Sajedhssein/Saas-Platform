<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateInviteRequest;
use App\Jobs\SendInviteEmail;
use App\Models\Invite;
use App\Services\ActivityLogService;
use App\Services\InviteService;
use App\Services\NotificationService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class InviteController extends Controller
{
    public function __construct(protected InviteService $inviteService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Invite::class);
        $status = strtolower(trim((string) $request->query('status', Invite::STATUS_ALL)));

        if (! in_array($status, Invite::STATUSES, true)) {
            $status = Invite::STATUS_ALL;
        }

        $invites = Invite::query()
            ->forCompany((string) auth()->user()->company_id)
            ->status($status)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(20);

        $data = collect($invites->items())->map(fn (Invite $invite) => $this->formatInvite($invite))->values();

        return response()->json([
            'success' => true,
            'data' => $data,
            'filters' => [
                'status' => $status,
                'available' => Invite::STATUSES,
            ],
            'meta' => [
                'current_page' => $invites->currentPage(),
                'last_page' => $invites->lastPage(),
                'per_page' => $invites->perPage(),
                'total' => $invites->total(),
            ],
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Invite::class);
        $data = Invite::query()
            ->forCompany((string) auth()->user()->company_id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Invite $invite) => $this->formatInvite($invite))
            ->values();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function clean(Request $request): JsonResponse
    {
        $this->authorize('updateAny', Invite::class);
        Invite::query()
            ->forCompany((string) auth()->user()->company_id)
            ->where('is_hidden', false)
            ->update(['is_hidden' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Invites archived successfully',
        ]);
    }

    public function restore(Invite $invite): JsonResponse
    {
        abort_unless($invite->company_id === auth()->user()->company_id, 404);
        $this->authorize('restore', $invite);

        $invite->forceFill(['is_hidden' => false])->save();

        return response()->json([
            'success' => true,
            'message' => 'Invite restored successfully',
        ]);
    }

    public function resend(Invite $invite): JsonResponse
    {
        abort_unless($invite->company_id === auth()->user()->company_id, 404);
        $this->authorize('update', $invite);

        try {
            $invite = $this->inviteService->resendInvite($invite);
        } catch (DomainException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        ActivityLogService::logInviteResent(auth()->user(), $invite, [
            'resend' => true,
            'resent_at' => optional($invite->last_resent_at)->toDateTimeString(),
        ], "{$invite->email} was resent an invite");

        SendInviteEmail::dispatch($invite);

        return response()->json([
            'success' => true,
            'message' => 'Invite resent successfully',
            'data' => [
                'invite_id' => $invite->public_id,
                'expires_at' => optional($invite->expires_at)->toDateTimeString(),
                'last_resent_at' => optional($invite->last_resent_at)->toDateTimeString(),
                'resent_count' => (int) ($invite->resent_count ?? 0),
            ],
        ]);
    }

    public function revoke(Invite $invite): JsonResponse
    {
        abort_unless($invite->company_id === auth()->user()->company_id, 404);
        $this->authorize('delete', $invite);

        $this->inviteService->revokeInvite($invite);

        ActivityLogService::logInviteRevoked(auth()->user(), $invite);

        return response()->json([
            'success' => true,
            'message' => 'Invite revoked successfully',
        ]);
    }

    public function stats(): JsonResponse
    {
        $this->authorize('stats', Invite::class);
        $baseQuery = Invite::query()
            ->forCompany((string) auth()->user()->company_id)
            ->where('is_hidden', false);

        $total = (clone $baseQuery)->count();
        $revoked = (clone $baseQuery)->where('revoked', true)->count();
        $accepted = (clone $baseQuery)->whereNotNull('used_at')->count();
        $expired = (clone $baseQuery)
            ->where('revoked', false)
            ->whereNull('used_at')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->count();
        $pending = (clone $baseQuery)
            ->where('revoked', false)
            ->whereNull('used_at')
            ->where(function ($query): void {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'pending' => $pending,
                'accepted' => $accepted,
                'expired' => $expired,
                'revoked' => $revoked,
            ],
        ]);
    }

    public function store(CreateInviteRequest $request): JsonResponse
    {
        $this->authorize('create', Invite::class);
        $data = $request->validated();

        $expiresInMinutes = $data['expires_in_minutes'] ?? null;
        $expiresAt = $expiresInMinutes
            ? Carbon::now()->addMinutes($expiresInMinutes)
            : Carbon::now()->addDays(7);

        try {
            $result = $this->inviteService->createInvite([
                'company_id' => auth()->user()->company_id,
                'created_by' => auth()->id(),
                'email' => $data['email'],
                'role' => $data['role'],
                'expires_at' => $expiresAt,
            ]);
        } catch (DomainException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        ActivityLogService::logInviteSent(auth()->user(), $result['model']);
        NotificationService::notifyUser(
            auth()->user(),
            'Invite Sent',
            "Invite sent to {$result['model']->email}",
            'invite',
            'invite',
            $result['model']->id,
            ['invite_email' => $result['model']->email]
        );

        SendInviteEmail::dispatch($result['model']);

        return response()->json([
            'success' => true,
            'message' => 'Invite created.',
            'data' => [
                'invite_id' => $result['model']->public_id,
                'expires_at' => optional($result['model']->expires_at)->toDateTimeString(),
            ],
        ], 201);
    }

    private function formatInvite(Invite $invite): array
    {
        return [
            'id' => $invite->public_id,
            'email' => $invite->email,
            'role' => $invite->role,
            'status' => $invite->status,
            'is_hidden' => (bool) $invite->is_hidden,
            'revoked' => (bool) $invite->revoked,
            'used_at' => optional($invite->used_at)->toDateTimeString(),
            'created_at' => optional($invite->created_at)->toDateTimeString(),
            'expires_at' => optional($invite->expires_at)->toDateTimeString(),
            'last_resent_at' => optional($invite->last_resent_at)->toDateTimeString(),
            'resent_count' => (int) ($invite->resent_count ?? 0),
        ];
    }
}
