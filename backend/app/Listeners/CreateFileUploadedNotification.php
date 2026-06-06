<?php

namespace App\Listeners;

use App\Events\FileUploaded;
use App\Services\NotificationService;

class CreateFileUploadedNotification
{
    public function handle(FileUploaded $event): void
    {
        $task = $event->task;
        $file = $event->file;

        // notify client associated with the project
        $project = $task->project;

        if (! $project) {
            return;
        }

        $client = $project->client;

        if (! $client) {
            return;
        }

        NotificationService::create(
            $client,
            'File uploaded',
            "A new file has been uploaded for project '{$project->name}'.",
            'file_uploaded',
            [
                'entity_type' => 'project',
                'entity_id' => $project->id,
                'link' => '/client/files',
            ]
        );
    }
}
