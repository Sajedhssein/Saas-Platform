<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invite extends Model
{
    use HasFactory, HasUuids;

    public const STATUS_PENDING = 'pending';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_REVOKED = 'revoked';
    public const STATUS_HIDDEN = 'hidden';
    public const STATUS_ALL = 'all';

    public const STATUSES = [
        self::STATUS_ALL,
        self::STATUS_PENDING,
        self::STATUS_ACCEPTED,
        self::STATUS_EXPIRED,
        self::STATUS_REVOKED,
        self::STATUS_HIDDEN,
    ];

    protected $table = 'invites';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'public_id', 'company_id', 'created_by', 'email', 'role', 'token_hash', 'expires_at', 'used_at', 'used_by', 'revoked', 'is_hidden', 'last_resent_at', 'resent_count',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
        'revoked' => 'boolean',
        'is_hidden' => 'boolean',
        'last_resent_at' => 'datetime',
        'resent_count' => 'integer',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function usedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'used_by');
    }

    protected static function booted(): void
    {
        static::creating(function (self $invite): void {
            if (empty($invite->public_id)) {
                $invite->public_id = (string) Str::ulid();
            }
        });
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function isRevoked(): bool
    {
        return (bool) $this->revoked;
    }

    public function isAccepted(): bool
    {
        return (bool) $this->used_at;
    }

    public function isHiddenInvite(): bool
    {
        return (bool) $this->is_hidden;
    }

    public function getStatusAttribute(): string
    {
        if ($this->isHiddenInvite()) {
            return self::STATUS_HIDDEN;
        }

        if ($this->isRevoked()) {
            return self::STATUS_REVOKED;
        }

        if ($this->isAccepted()) {
            return self::STATUS_ACCEPTED;
        }

        if ($this->isExpired()) {
            return self::STATUS_EXPIRED;
        }

        return self::STATUS_PENDING;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function scopeForCompany($query, string $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    public function scopeStatus($query, string $status)
    {
        return match ($status) {
            self::STATUS_ALL => $query->where('is_hidden', false),
            self::STATUS_HIDDEN => $query->where('is_hidden', true),
            self::STATUS_REVOKED => $query->where('is_hidden', false)->where('revoked', true),
            self::STATUS_ACCEPTED => $query->where('is_hidden', false)->whereNotNull('used_at')->where('revoked', false),
            self::STATUS_EXPIRED => $query->where('is_hidden', false)->where('revoked', false)->whereNull('used_at')->whereNotNull('expires_at')->where('expires_at', '<=', now()),
            default => $query->where('is_hidden', false)->where('revoked', false)->whereNull('used_at')->where(function ($query): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            }),
        };
    }

    public function markUsed($userId = null): void
    {
        $this->used_at = Carbon::now();
        $this->used_by = $userId;
        $this->save();
    }

    public function markRevoked(): void
    {
        $this->revoked = true;
        $this->save();
    }

    public function markResent(?Carbon $expiresAt = null): void
    {
        $this->last_resent_at = Carbon::now();
        $this->resent_count = (int) ($this->resent_count ?? 0) + 1;

        if ($expiresAt) {
            $this->expires_at = $expiresAt;
        }

        $this->save();
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }
}
