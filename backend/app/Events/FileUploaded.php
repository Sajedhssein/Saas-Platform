<?php

namespace App\Events;

use App\Models\Task;
use App\Models\TaskFile;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

class FileUploaded
{
    use Dispatchable;

    public function __construct(
        public TaskFile $file,
        public Task $task,
        public User $uploadedBy
    ) {}
}
