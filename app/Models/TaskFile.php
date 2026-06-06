<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class TaskFile extends Model
{
    use HasUuids, SoftDeletes, HasFactory;

    protected $fillable = [
        'task_id',
        'uploaded_by',
        'file_name',
        'file_path',
        'file_type',
        'file_size',
    ];

    public function task() {
        return $this->belongsTo(Task::class);
    }
    public function uploader() {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

}
