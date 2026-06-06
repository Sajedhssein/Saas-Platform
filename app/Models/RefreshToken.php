<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RefreshToken extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'refresh_tokens';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'token_hash',
        'device',
        'ip',
        'revoked',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'revoked' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
