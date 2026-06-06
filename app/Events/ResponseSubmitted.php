<?php

namespace App\Events;

use App\Models\Task;
use App\Models\TaskResponse;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

class ResponseSubmitted
{
    use Dispatchable;

    public function __construct(
        public TaskResponse $response,
        public Task $task,
        public User $submittedBy
    ) {}
}
