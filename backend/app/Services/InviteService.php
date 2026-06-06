<?php

namespace App\Services;

use App\Models\Invite;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Carbon;
use DomainException;

class InviteService
{
    protected function hashToken(string $token): string
    {
        $key = Config::get('app.key');
        return hash_hmac('sha256', $token, $key);
    }

    public function createInvite(array $data): array
    {
        $email = strtolower(trim($data['email']));

        $activeInviteExists = Invite::query()
            ->where('company_id', $data['company_id'])
            ->whereRaw('LOWER(email) = ?', [$email])
            ->where('revoked', false)
            ->whereNull('used_at')
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', Carbon::now());
            })
            ->exists();

        if ($activeInviteExists) {
            throw new DomainException('An active invite already exists for this email.');
        }

        $plain = Str::random(48);
        $hash = $this->hashToken($plain);

        $invite = Invite::create([
            'company_id' => $data['company_id'],
            'created_by' => $data['created_by'] ?? null,
            'email' => $email,
            'role' => strtolower(trim($data['role'])),
            'token_hash' => $hash,
            'expires_at' => $data['expires_at'] ?? Carbon::now()->addDays(7),
        ]);

        return ['model' => $invite];
    }

    public function resendInvite(Invite $invite): Invite
    {
        if ($invite->isHiddenInvite()) {
            throw new DomainException('This invite is archived.');
        }

        if ($invite->isRevoked() || $invite->isAccepted()) {
            throw new DomainException('This invite can no longer be resent.');
        }

        $expiresAt = $invite->isExpired() || ! $invite->expires_at
            ? Carbon::now()->addDays(7)
            : $invite->expires_at;

        $invite->markResent($expiresAt);

        return $invite->refresh();
    }

    public function findByPlain(string $plain)
    {
        $hash = $this->hashToken($plain);
        return Invite::where('token_hash', $hash)->first();
    }

    public function findByPublicId(string $publicId): ?Invite
    {
        return Invite::where('public_id', $publicId)->first();
    }

    public function revokeInvite(Invite $invite): void
    {
        if (! $invite->isRevoked()) {
            $invite->markRevoked();
        }
    }
}
