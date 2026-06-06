<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'user_id',
        'task_assigned',
        'task_completed',
        'project_updated',
        'report_generated',
        'employee_joined',
        'invite_accepted',
    ];

    protected $casts = [
        'task_assigned' => 'boolean',
        'task_completed' => 'boolean',
        'project_updated' => 'boolean',
        'report_generated' => 'boolean',
        'employee_joined' => 'boolean',
        'invite_accepted' => 'boolean',
    ];

    public static function defaults(): array
    {
        return [
            'task_assigned' => true,
            'task_completed' => true,
            'project_updated' => true,
            'report_generated' => true,
            'employee_joined' => true,
            'invite_accepted' => true,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
