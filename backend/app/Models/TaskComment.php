<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;

class TaskComment extends Model
{
    use HasUuids, SoftDeletes, HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'comment',
    ];

    /**
     * Determine if the comment has been edited
     */
    protected function isEdited(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->updated_at > $this->created_at,
        );
    }

    public function task () {
        return $this->belongsTo(Task::class);
    }

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function attachment() {
        return $this->hasOne(TaskFile::class, 'comment_id');
    }
}
