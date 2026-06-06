<?php

namespace App\Events;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

class TaskStatusChanged
{
    use Dispatchable;

    public function __construct(
        public Task $task,
        public string $oldStatus,
        public string $newStatus,
        public User $changedBy
    ) {}
}
