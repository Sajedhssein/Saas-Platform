<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'company_id',
        'user_id',
        'title',
        'message',
        'type',
        'entity_type',
        'entity_id',
        'metadata',
        'data',
        'is_read',
        'read_at',
        'is_hidden',
    ];

    protected $casts = [
        'company_id' => 'string',
        'entity_id' => 'string',
        'metadata' => 'array',
        'data' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'is_hidden' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $notification): void {
            if (! $notification->company_id && $notification->user_id) {
                $notification->company_id = User::query()->whereKey($notification->user_id)->value('company_id');
            }

            if (blank($notification->metadata) && is_array($notification->data)) {
                $notification->metadata = $notification->data;
            }

            if (blank($notification->data) && is_array($notification->metadata)) {
                $notification->data = $notification->metadata;
            }
        });
    }

    public function setUserIdAttribute($value): void
    {
        $this->attributes['user_id'] = $value;

        if (empty($this->attributes['company_id'])) {
            $this->attributes['company_id'] = User::query()->whereKey($value)->value('company_id');
        }
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function user(): BelongsTo {
        return $this->belongsTo(User::class);
    }

}
