<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TaskResponseResource extends JsonResource
{
    public function toArray($request): array
    {
        $attachmentUrl = $this->attachment_url;

        if ($attachmentUrl && ! Str::startsWith($attachmentUrl, ['http://', 'https://'])) {
            $attachmentUrl = Storage::disk(config('filesystems.default'))->url($attachmentUrl);
        }

        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'user_id' => $this->user_id,
            'response' => $this->response,
            'status' => $this->status,
            'attachment_url' => $attachmentUrl,
            'submitted_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
