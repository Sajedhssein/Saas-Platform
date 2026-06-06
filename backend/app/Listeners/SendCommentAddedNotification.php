<?php

namespace App\Listeners;

use App\Events\CommentAdded;
use App\Services\NotificationService;

class SendCommentAddedNotification
{
    public function handle(CommentAdded $event): void
    {
        $event->task->loadMissing('users', 'creator');

        $recipients = $event->task->users
            ->where('id', '!=', $event->commentedBy->id)
            ->values();

        if ($event->task->created_by && $event->task->creator && $event->task->creator->id !== $event->commentedBy->id) {
            $recipients->push($event->task->creator);
        }

        NotificationService::notifyMany(
            $recipients,
            'New Comment',
            "{$event->commentedBy->name} commented on task {$event->task->title}",
            'comment_added',
            'task',
            $event->task->id,
            [
                'comment_id' => $event->comment->id,
                'commented_by' => $event->commentedBy->name,
            ]
        );
    }
}
