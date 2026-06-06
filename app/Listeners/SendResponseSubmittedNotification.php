<?php

namespace App\Listeners;

use App\Events\ResponseSubmitted;
use App\Services\NotificationService;

class SendResponseSubmittedNotification
{
    public function handle(ResponseSubmitted $event): void
    {
        $event->task->loadMissing('creator');

        if ($event->task->created_by && $event->task->creator && $event->task->creator->id !== $event->submittedBy->id) {
            NotificationService::notifyUser(
                $event->task->creator,
                'Response Submitted',
                "{$event->submittedBy->name} submitted a response to task {$event->task->title}",
                'response_submitted',
                'task',
                $event->task->id,
                [
                    'response_id' => $event->response->id,
                    'submitted_by' => $event->submittedBy->name,
                ]
            );
        }
    }
}
