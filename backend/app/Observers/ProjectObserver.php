<?php

namespace App\Observers;

use App\Models\Project;
use App\Services\NotificationService;

class ProjectObserver
{
    public function created(Project $project): void
    {
        // If a project is created with a client assigned, notify the client
        if ($project->client_id) {
            $client = $project->client;

            if ($client) {
                NotificationService::create(
                    $client,
                    'Project assigned',
                    "You have been assigned to project: {$project->name}",
                    'project_assigned',
                    [
                        'entity_type' => 'project',
                        'entity_id' => $project->id,
                        'link' => "/client/projects/{$project->id}",
                    ]
                );
            }
        }
    }

    public function updated(Project $project): void
    {
        $original = $project->getOriginal();

        // client assignment changed
        if (array_key_exists('client_id', $original) && $original['client_id'] !== $project->client_id && $project->client_id) {
            $client = $project->client;

            if ($client) {
                NotificationService::create(
                    $client,
                    'Project assigned',
                    "You have been assigned to project: {$project->name}",
                    'project_assigned',
                    [
                        'entity_type' => 'project',
                        'entity_id' => $project->id,
                        'link' => "/client/projects/{$project->id}",
                    ]
                );
            }
        }

        // status changed
        if (array_key_exists('status', $original) && $original['status'] !== $project->status) {
            $client = $project->client;

            if ($client) {
                $type = 'project_status_changed';
                $title = 'Project status updated';
                $message = "Project '{$project->name}' status changed to {$project->status}";

                // if completed, use completed type
                if (strtolower($project->status) === 'completed' || strtolower($project->status) === 'complete') {
                    $type = 'project_completed';
                    $title = 'Project completed';
                    $message = "Project '{$project->name}' has been completed";
                }

                NotificationService::create(
                    $client,
                    $title,
                    $message,
                    $type,
                    [
                        'entity_type' => 'project',
                        'entity_id' => $project->id,
                        'link' => "/client/projects/{$project->id}",
                    ]
                );
            }
        }
    }
}
