<?php

namespace App\Listeners;

use App\Events\FileUploaded;
use App\Services\NotificationService;

class SendFileUploadedNotification
{
    public function handle(FileUploaded $event): void
    {
        $event->task->loadMissing('users', 'creator');

        $recipients = $event->task->users
            ->where('id', '!=', $event->uploadedBy->id)
            ->values();

        if ($event->task->created_by && $event->task->creator && $event->task->creator->id !== $event->uploadedBy->id) {
            $recipients->push($event->task->creator);
        }

        NotificationService::notifyMany(
            $recipients,
            'File Uploaded',
            "{$event->uploadedBy->name} uploaded {$event->file->file_name} to task {$event->task->title}",
            'file_uploaded',
            'task',
            $event->task->id,
            [
                'file_id' => $event->file->id,
                'uploaded_by' => $event->uploadedBy->name,
                'file_name' => $event->file->file_name,
            ]
        );
    }
}
