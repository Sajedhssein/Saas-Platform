<?php

namespace App\Listeners;

use App\Events\TaskStatusChanged;
use App\Models\User;
use App\Services\NotificationService;

class SendTaskStatusChangedNotification
{
    public function handle(TaskStatusChanged $event): void
    {
        $assignedUsers = $event->task->users()->get();

        foreach ($assignedUsers as $assignedUser) {
            if ($assignedUser->id === $event->changedBy->id) {
                continue;
            }

            NotificationService::notifyUser(
                $assignedUser,
                'Task Status Updated',
                "Task {$event->task->title} status changed from {$event->oldStatus} to {$event->newStatus}",
                'task_status_changed',
                'task',
                $event->task->id,
                [
                    'old_status' => $event->oldStatus,
                    'new_status' => $event->newStatus,
                    'changed_by' => $event->changedBy->name,
                ]
            );
        }

        if ($event->newStatus === 'completed') {
            $event->task->loadMissing('project.creator');
            $recipient = $event->task->project?->creator;

            if ($recipient && $recipient->id !== $event->changedBy->id) {
                NotificationService::notifyUser(
                    $recipient,
                    'Task Completed',
                    "Task {$event->task->title} was completed",
                    'task_completed',
                    'task',
                    $event->task->id,
                    [
                        'completed_by' => $event->changedBy->name,
                    ]
                );
            }
        }
    }
}
