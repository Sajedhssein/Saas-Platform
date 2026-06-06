<?php

namespace App\Services;

use App\Models\RefreshToken;
use App\Models\User;
use Illuminate\Support\Str;
//use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Carbon;

class RefreshTokenService
{
    protected function hashToken(string $token): string
    {
        $key = Config::get('app.key');
        return hash_hmac('sha256', $token, $key);
    }

    public function createForUser(User $user, ?string $device = null, ?string $ip = null, ?int $ttlMinutes = null): array
    {
        $plain = Str::random(64);
        $hash = $this->hashToken($plain);

        $ttl = $ttlMinutes ?? (int)config('jwt.refresh_ttl', 20160);
        $expiresAt = Carbon::now()->addMinutes($ttl);

        $token = RefreshToken::create([
            'user_id' => $user->id,
            'token_hash' => $hash,
            'device' => $device,
            'ip' => $ip,
            'expires_at' => $expiresAt,
        ]);

        return ['plain' => $plain, 'model' => $token];
    }

    public function findByPlain(string $plain)
    {
        $hash = $this->hashToken($plain);
        return RefreshToken::where('token_hash', $hash)->first();
    }

    public function revoke(RefreshToken $token): void
    {
        $token->revoked = true;
        $token->save();
    }

    public function revokeAllForUser(User $user): int
    {
        return RefreshToken::where('user_id', $user->id)->update(['revoked' => true]);
    }
}
