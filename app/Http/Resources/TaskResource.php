<?php

namespace App\Http\Resources;

use App\Http\Resources\TaskFileResource;
use App\Http\Resources\TaskResponseResource;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'project' => $this->project ? [
                'id' => $this->project->id,
                'name' => $this->project->name,
            ] : null,
            'created_by' => $this->created_by,
            'creator' => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
            ] : null,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'progress' => $this->progress,
            'deadline' => $this->deadline?->toDateTimeString(),
            'estimated_hours' => $this->estimated_hours,
            'assignees' => $this->whenLoaded('users', function () {
                return $this->users->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->pivot->role,
                    ];
                });
            }),
            'files' => $this->whenLoaded('files', TaskFileResource::collection($this->files)),
            'responses' => $this->whenLoaded('responses', TaskResponseResource::collection($this->responses)),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
