<?php

namespace App\Events;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

class TaskAssigned
{
    use Dispatchable;

    public function __construct(
        public Task $task,
        public User $assignee,
        public User $assignedBy
    ) {}
}
