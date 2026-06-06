<?php

namespace App\Events;

use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

class CommentAdded
{
    use Dispatchable;

    public function __construct(
        public TaskComment $comment,
        public Task $task,
        public User $commentedBy
    ) {}
}
