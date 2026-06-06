<?php

namespace App\Listeners;

use App\Events\TaskAssigned;
use App\Services\NotificationService;

class SendTaskAssignedNotification
{
    public function handle(TaskAssigned $event): void
    {
        NotificationService::notifyUser(
            $event->assignee,
            'Task Assigned',
            "You were assigned to task {$event->task->title}",
            'task_assigned',
            'task',
            $event->task->id,
            [
                'assigned_by' => $event->assignedBy->name,
            ]
        );
    }
}
