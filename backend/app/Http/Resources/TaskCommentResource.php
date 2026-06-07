<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TaskCommentResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'avatar_url' => $this->user->avatar_url,
            ],
            'content' => $this->comment,
            'attachment' => $this->whenLoaded('attachment', fn () => new TaskFileResource($this->attachment)),
            'is_edited' => $this->is_edited,
            'edited_at' => $this->is_edited ? $this->updated_at?->toDateTimeString() : null,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
