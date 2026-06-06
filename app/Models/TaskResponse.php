<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class TaskResponse extends Model
{
    use HasUuids, SoftDeletes, HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'response',
        'status',
        'attachment_url',
    ];

    public function task() {
        return $this->belongsTo(Task::class);
    }

    public function user() {
        return $this->belongsTo(User::class);
    }

}
